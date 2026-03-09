"""
Automatic Lead Ingestion from Gmail via IMAP.
Periodically checks a Gmail inbox for new lead emails, parses them, and creates leads.
"""
import imaplib
import email as email_lib
from email.header import decode_header
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends

from database import db
from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email-ingest", tags=["email-ingest"])

# ═══════════════════════════════════════════════
# PHONE NUMBER FIX
# ═══════════════════════════════════════════════

def fix_phone(phone: str) -> str:
    """Fix phone numbers where first 3 digits are repeated.
    E.g. '6306302871212' -> '6302871212'
    """
    digits = re.sub(r'\D', '', phone)
    if len(digits) > 10 and digits[:3] == digits[3:6]:
        digits = digits[3:]
    # Format as (XXX) XXX-XXXX if 10 digits
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return digits


# ═══════════════════════════════════════════════
# EMAIL PARSER
# ═══════════════════════════════════════════════

def parse_lead_from_email(text: str) -> dict:
    """Parse a lead assignment email into structured data."""
    data = {
        "salesman_number": "",
        "customer_number": "",
        "name": "",
        "address": "",
        "city": "",
        "state": "",
        "zip": "",
        "phone": "",
        "email": "",
        "unit_type": "",
        "visit_date": "",
        "comments": "",
    }

    lines = text.strip().split('\n')
    notes_lines = []
    misc_info = ""
    in_notes = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check for Notes section (multi-line)
        if line.lower().startswith('notes:'):
            in_notes = True
            note_content = line.split(':', 1)[1].strip() if ':' in line else ''
            if note_content and note_content != '-':
                notes_lines.append(note_content.strip('-').strip())
            continue

        if in_notes:
            # Notes can span multiple lines, often prefixed with -
            cleaned = line.strip('-').strip()
            if cleaned and ' - ' in line and any(k in line.lower() for k in ['salesman', 'customer', 'address', 'city', 'phone', 'email', 'item', 'start date', 'end date', 'misc']):
                in_notes = False  # New field found, stop collecting notes
            else:
                if cleaned:
                    notes_lines.append(cleaned)
                continue

        if ' - ' not in line:
            continue

        key, val = line.split(' - ', 1)
        key = key.strip().lower()
        val = val.strip()

        if not val:
            continue

        if 'salesman #' in key or 'salesman number' in key:
            data["salesman_number"] = val
        elif 'customer name' in key:
            data["name"] = val.title() if val == val.upper() else val
        elif 'customer #' in key or 'customer number' in key:
            data["customer_number"] = val
        elif key == 'address 1':
            data["address"] = val
        elif key == 'city':
            data["city"] = val
        elif key == 'state':
            data["state"] = val
        elif key == 'zip':
            data["zip"] = val
        elif 'customer phone' in key:
            data["phone"] = fix_phone(val)
        elif 'caller phone' in key and not data["phone"]:
            data["phone"] = fix_phone(val)
        elif 'contact phone' in key and not data["phone"]:
            data["phone"] = fix_phone(val)
        elif key == 'email':
            data["email"] = val.strip().lower()
        elif key == 'item':
            data["unit_type"] = val
        elif 'start date' in key:
            # Parse visit date from Start Date/Time
            try:
                dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
                data["visit_date"] = dt.strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                # Try other formats
                for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%d', '%m/%d/%Y']:
                    try:
                        dt = datetime.strptime(val.strip(), fmt)
                        data["visit_date"] = dt.strftime('%Y-%m-%d')
                        break
                    except ValueError:
                        continue
        elif 'misc info' in key:
            misc_info = val

    # Build comments from Misc Info + Notes
    comment_parts = []
    if misc_info:
        comment_parts.append(misc_info)
    if notes_lines:
        comment_parts.append(' '.join(notes_lines))
    data["comments"] = '\n'.join(comment_parts) if comment_parts else ""

    return data


# ═══════════════════════════════════════════════
# IMAP GMAIL CONNECTION
# ═══════════════════════════════════════════════

async def get_email_config():
    """Get email ingestion config from DB."""
    config = await db.email_ingest_config.find_one({}, {"_id": 0})
    return config


async def fetch_new_emails(config: dict) -> list:
    """Connect to Gmail via IMAP and fetch unread emails from salesrequest."""
    gmail_user = config["gmail_address"]
    gmail_pass = config["gmail_app_password"]
    # Only process emails that contain 'salesrequest' in from/subject (forwarded leads)
    sender_filter = config.get("sender_filter", "salesrequest")

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_user, gmail_pass)
        mail.select("INBOX")

        # Search for unread emails
        status, data = mail.search(None, "UNSEEN")
        if status != "OK" or not data[0]:
            mail.logout()
            return []

        email_ids = data[0].split()
        results = []

        for eid in email_ids:
            status, msg_data = mail.fetch(eid, "(RFC822)")
            if status != "OK":
                continue

            msg = email_lib.message_from_bytes(msg_data[0][1])

            # Get email date
            date_str = msg.get("Date", "")
            email_date = None
            if date_str:
                try:
                    email_date = email_lib.utils.parsedate_to_datetime(date_str)
                except Exception:
                    pass

            # Get from address
            from_addr = msg.get("From", "").lower()

            # Get subject
            subject = ""
            raw_subject = msg.get("Subject", "")
            if raw_subject:
                decoded = decode_header(raw_subject)
                subject = decoded[0][0]
                if isinstance(subject, bytes):
                    subject = subject.decode(decoded[0][1] or "utf-8", errors="replace")

            # Filter: only process emails related to salesrequest
            # Check from, subject, and forwarded-from headers
            is_sales_email = False
            if sender_filter:
                check_text = f"{from_addr} {subject.lower()} {msg.get('X-Forwarded-To', '').lower()} {msg.get('Reply-To', '').lower()}"
                if sender_filter.lower() in check_text:
                    is_sales_email = True
            else:
                is_sales_email = True

            # Get body
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or "utf-8"
                            body = payload.decode(charset, errors="replace")
                            break
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    charset = msg.get_content_charset() or "utf-8"
                    body = payload.decode(charset, errors="replace")

            # Also check body for salesrequest keyword if not found in headers
            if not is_sales_email and sender_filter:
                if sender_filter.lower() in body.lower():
                    is_sales_email = True
                # Also check if body contains typical lead format (Salesman # and Customer Name)
                if "salesman #" in body.lower() and "customer name" in body.lower():
                    is_sales_email = True

            if not is_sales_email:
                # Mark as read but skip processing
                mail.store(eid, "+FLAGS", "\\Seen")
                logger.info(f"Skipped non-sales email: {subject[:50]}")
                continue

            results.append({
                "email_id": eid.decode(),
                "subject": subject,
                "date": email_date,
                "body": body,
                "from": from_addr,
            })

            # Mark as read
            mail.store(eid, "+FLAGS", "\\Seen")

        mail.logout()
        return results

    except imaplib.IMAP4.error as e:
        logger.error(f"IMAP error: {e}")
        raise
    except Exception as e:
        logger.error(f"Email fetch error: {e}")
        raise


# ═══════════════════════════════════════════════
# LEAD CREATION FROM EMAIL
# ═══════════════════════════════════════════════

async def create_lead_from_parsed(parsed: dict, email_date=None) -> dict:
    """Create a lead in the DB from parsed email data."""
    from server import normalize_status, sync_lead_to_sp_collection

    # Find salesperson by sales_number
    salesperson = None
    if parsed.get("salesman_number"):
        salesperson = await db.users.find_one(
            {"sales_number": parsed["salesman_number"]},
            {"_id": 0}
        )

    if not salesperson:
        logger.warning(f"No salesperson found for salesman # {parsed.get('salesman_number')}")
        return None

    # Check for duplicate by customer_number + salesperson
    if parsed.get("customer_number"):
        existing = await db.leads.find_one({
            "customer_number": parsed["customer_number"],
            "salesperson_id": salesperson["user_id"],
        })
        if existing:
            logger.info(f"Lead already exists: {parsed['name']} (#{parsed['customer_number']})")
            return None

    # Use visit_date from email content, fallback to email date
    visit_date = parsed.get("visit_date", "")
    if not visit_date and email_date:
        visit_date = email_date.strftime('%Y-%m-%d')

    # Calculate follow_up_date (2 days after visit)
    follow_up_date = ""
    if visit_date:
        try:
            vd = datetime.strptime(visit_date, '%Y-%m-%d')
            follow_up_date = (vd + timedelta(days=2)).strftime('%Y-%m-%d')
        except ValueError:
            pass

    doc = {
        "lead_id": str(uuid.uuid4()),
        "customer_number": parsed.get("customer_number", ""),
        "name": parsed.get("name", ""),
        "address": parsed.get("address", ""),
        "city": parsed.get("city", ""),
        "email": parsed.get("email", ""),
        "phone": parsed.get("phone", ""),
        "unit_type": parsed.get("unit_type", ""),
        "ticket_value": 0,
        "commission_percent": 0,
        "commission_value": 0,
        "spif_total": 0,
        "status": "PENDING",
        "visit_date": visit_date,
        "close_date": "",
        "install_date": "",
        "follow_up_date": follow_up_date,
        "loss_reason": "",
        "comments": parsed.get("comments", ""),
        "feeling": "",
        "objections": "",
        "duct_cleaning": 0,
        "apco_x": 0,
        "samsung": 0,
        "mitsubishi": 0,
        "surge_protector": 0,
        "self_gen_mits": 0,
        "salesperson_id": salesperson["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "email_auto",
    }

    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    await sync_lead_to_sp_collection(doc)

    logger.info(f"Auto-created lead: {doc['name']} -> {salesperson['name']}")
    return doc


# ═══════════════════════════════════════════════
# BACKGROUND TASK
# ═══════════════════════════════════════════════

async def check_email_inbox():
    """Background task: check Gmail inbox and process new lead emails."""
    config = await get_email_config()
    if not config or not config.get("enabled"):
        return {"processed": 0, "message": "Email ingestion not configured or disabled"}

    try:
        emails = await fetch_new_emails(config)
    except Exception as e:
        logger.error(f"Failed to fetch emails: {e}")
        return {"processed": 0, "error": str(e)}

    created = []
    skipped = []
    errors = []

    for em in emails:
        try:
            parsed = parse_lead_from_email(em["body"])
            if not parsed.get("name"):
                skipped.append({"subject": em["subject"], "reason": "No customer name found"})
                continue

            lead = await create_lead_from_parsed(parsed, em.get("date"))
            if lead:
                created.append({"name": lead["name"], "salesperson_id": lead["salesperson_id"]})
            else:
                skipped.append({"name": parsed.get("name", ""), "reason": "Duplicate or no salesperson"})
        except Exception as e:
            errors.append({"subject": em["subject"], "error": str(e)})

    # Log results
    result = {
        "processed": len(emails),
        "created": len(created),
        "skipped": len(skipped),
        "errors": len(errors),
        "details": {"created": created, "skipped": skipped, "errors": errors},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await db.email_ingest_log.insert_one({**result, "created_at": datetime.now(timezone.utc)})

    logger.info(f"Email ingest: {len(emails)} emails, {len(created)} leads created, {len(skipped)} skipped")
    return result


# ═══════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════

@router.get("/config")
async def get_config(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    config = await get_email_config()
    if config:
        # Mask password
        config["gmail_app_password"] = "****" if config.get("gmail_app_password") else ""
    return {"config": config}


@router.post("/config")
async def save_config(body: dict, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    gmail_address = body.get("gmail_address", "").strip()
    gmail_app_password = body.get("gmail_app_password", "").strip()
    enabled = body.get("enabled", False)
    check_interval_minutes = body.get("check_interval_minutes", 5)
    sender_filter = body.get("sender_filter", "salesrequest").strip()

    if not gmail_address or not gmail_app_password:
        raise HTTPException(status_code=400, detail="Gmail address and app password are required")

    config = {
        "gmail_address": gmail_address,
        "gmail_app_password": gmail_app_password,
        "enabled": enabled,
        "check_interval_minutes": max(1, min(60, check_interval_minutes)),
        "sender_filter": sender_filter,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"],
    }

    await db.email_ingest_config.update_one({}, {"$set": config}, upsert=True)
    return {"message": "Email ingestion config saved", "enabled": enabled}


@router.post("/test-connection")
async def test_connection(user=Depends(get_current_user)):
    """Test the Gmail IMAP connection without processing emails."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    config = await get_email_config()
    if not config:
        raise HTTPException(status_code=400, detail="Email ingestion not configured")

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(config["gmail_address"], config["gmail_app_password"])
        status, data = mail.select("INBOX")
        msg_count = int(data[0]) if status == "OK" else 0
        # Count unread
        status, data = mail.search(None, "UNSEEN")
        unread = len(data[0].split()) if status == "OK" and data[0] else 0
        mail.logout()
        return {"status": "ok", "total_messages": msg_count, "unread_messages": unread}
    except imaplib.IMAP4.error as e:
        raise HTTPException(status_code=400, detail=f"IMAP login failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")


@router.post("/check-now")
async def check_now(user=Depends(get_current_user)):
    """Manually trigger email inbox check."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await check_email_inbox()
    return result


@router.post("/parse-test")
async def parse_test(body: dict, user=Depends(get_current_user)):
    """Test the email parser with sample text."""
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    parsed = parse_lead_from_email(text)
    parsed["phone_fixed"] = True if parsed.get("phone") else False
    return {"parsed": parsed}


@router.get("/logs")
async def get_logs(user=Depends(get_current_user)):
    """Get recent email ingestion logs."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    logs = await db.email_ingest_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"logs": logs}


@router.get("/salespeople-numbers")
async def get_salespeople_numbers(user=Depends(get_current_user)):
    """Get all salespeople with their sales numbers."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find(
        {"role": "salesperson"},
        {"_id": 0, "user_id": 1, "name": 1, "sales_number": 1}
    ).to_list(100)
    return {"salespeople": users}


@router.put("/salespeople-number/{user_id}")
async def update_sales_number(user_id: str, body: dict, user=Depends(get_current_user)):
    """Update a salesperson's sales number."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    sales_number = body.get("sales_number", "").strip()
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"sales_number": sales_number}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Sales number updated"}
