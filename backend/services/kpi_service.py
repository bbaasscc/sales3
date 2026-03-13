"""KPI processing service - calculates all dashboard metrics from lead data."""
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional

from utils import normalize_status, safe_float, safe_date, EXCLUDED_STATUSES, standardize_unit_type
from routers.admin import PAY_PERIODS


def process_sales_data(df: pd.DataFrame, date_filter: str = "all", pay_period: str = None, from_db: bool = False) -> dict:
    """Process sales data and calculate KPIs - returns dict."""
    if not from_db:
        column_mapping = {}
        for col in df.columns:
            cl = str(col).lower().strip()
            if cl == '#' or cl == 'number': column_mapping[col] = 'customer_number'
            elif cl == 'name': column_mapping[col] = 'name'
            elif cl == 'address': column_mapping[col] = 'address'
            elif cl == 'city': column_mapping[col] = 'city'
            elif cl in ['unit', 'unit type']: column_mapping[col] = 'unit_type'
            elif cl == 'ticket value': column_mapping[col] = 'ticket_value'
            elif cl == 'commission %': column_mapping[col] = 'commission_percent'
            elif cl == 'commission value': column_mapping[col] = 'commission_value'
            elif cl == 'spif': column_mapping[col] = 'spif_total'
            elif cl == 'status': column_mapping[col] = 'status'
            elif cl == 'visit date': column_mapping[col] = 'visit_date'
            elif cl == 'close date': column_mapping[col] = 'close_date'
            elif cl == 'install date': column_mapping[col] = 'install_date'
            elif cl in ['folow up on self gen', 'follow up on', 'folow up on', 'follow up']: column_mapping[col] = 'follow_up_date'
            elif 'self gen' in cl and 'mits' in cl: column_mapping[col] = 'self_gen_mits'
            elif 'apco' in cl: column_mapping[col] = 'apco_x'
            elif 'samsung' in cl: column_mapping[col] = 'samsung'
            elif 'mitsubishi' in cl or 'mits' in cl: column_mapping[col] = 'mitsubishi'
            elif 'surge' in cl: column_mapping[col] = 'surge_protector'
            elif 'duct' in cl or 'dusct' in cl: column_mapping[col] = 'duct_cleaning'
        df = df.rename(columns=column_mapping)
        df = df.loc[:, ~df.columns.duplicated()]

    for col in ['customer_number', 'name', 'status', 'unit_type', 'ticket_value', 'commission_value', 'commission_percent',
                'visit_date', 'close_date', 'install_date', 'follow_up_date', 'spif_total',
                'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']:
        if col not in df.columns:
            df[col] = None

    df['status'] = df['status'].apply(normalize_status)
    for fc in ['ticket_value', 'commission_value', 'spif_total', 'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']:
        df[fc] = df[fc].apply(safe_float)

    def clean_cp(x):
        val = safe_float(x)
        return round(val * 100, 2) if 0 < val < 1 else round(val, 2)
    df['commission_percent'] = df['commission_percent'].apply(clean_cp)

    for dc in ['visit_date', 'close_date', 'install_date', 'follow_up_date']:
        df[dc] = df[dc].apply(safe_date)

    # Standardize unit types for consistent charts
    df['unit_type'] = df['unit_type'].apply(lambda x: standardize_unit_type(str(x).strip()) if pd.notna(x) and str(x).strip() else '')

    df['effective_close_date'] = df['close_date'].combine_first(df['visit_date'])

    now = datetime.now(timezone.utc)
    start_date, end_date = None, None
    if pay_period and pay_period != "all":
        for pn, ps, pe in PAY_PERIODS:
            if pn == pay_period:
                start_date, end_date = ps, pe
                break
    elif date_filter == "week": start_date = now - timedelta(days=7)
    elif date_filter == "2weeks": start_date = now - timedelta(days=14)
    elif date_filter == "current_year":
        start_date = datetime(now.year, 1, 1)
        end_date = datetime(now.year, 12, 31)
    elif date_filter == "last_year":
        start_date = datetime(now.year - 1, 1, 1)
        end_date = datetime(now.year - 1, 12, 31)

    EXCLUDED_FROM_VISITS = {'CANCEL_APPOINTMENT', 'RESCHEDULED'}

    if start_date:
        sn = start_date.replace(tzinfo=None) if hasattr(start_date, 'tzinfo') and start_date.tzinfo else start_date
        en = end_date if end_date else None
        if en:
            df_close = df[df['effective_close_date'].notna() & (df['effective_close_date'] >= sn) & (df['effective_close_date'] <= en)]
            df_install = df[df['install_date'].notna() & (df['install_date'] >= sn) & (df['install_date'] <= en)]
        else:
            df_close = df[df['effective_close_date'].notna() & (df['effective_close_date'] >= sn)]
            df_install = df[df['install_date'].notna() & (df['install_date'] >= sn)]
    else:
        df_close, df_install = df, df
        sn, en = None, None

    closed_df = df_close[df_close['status'] == 'SALE']
    credit_reject_df = df_close[df_close['status'] == 'CREDIT_REJECT']
    lost_df = df_close[df_close['status'] == 'LOST']
    pending_df = df_close[df_close['status'] == 'PENDING']

    if start_date:
        if en:
            cancel_df = df[df['status'].eq('CANCEL_APPOINTMENT') & df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en)]
            rescheduled_df = df[df['status'].eq('RESCHEDULED') & df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en)]
        else:
            cancel_df = df[df['status'].eq('CANCEL_APPOINTMENT') & df['visit_date'].notna() & (df['visit_date'] >= sn)]
            rescheduled_df = df[df['status'].eq('RESCHEDULED') & df['visit_date'].notna() & (df['visit_date'] >= sn)]
    else:
        cancel_df = df[df['status'] == 'CANCEL_APPOINTMENT']
        rescheduled_df = df[df['status'] == 'RESCHEDULED']
    installed_df = df_install[df_install['status'] == 'SALE']

    if start_date:
        if en:
            leads_df = df[df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en) & ~df['status'].isin(EXCLUDED_FROM_VISITS)]
        else:
            leads_df = df[df['visit_date'].notna() & (df['visit_date'] >= sn) & ~df['status'].isin(EXCLUDED_FROM_VISITS)]
        total_visits = len(leads_df)
    else:
        leads_df = df[df['visit_date'].notna() & ~df['status'].isin(EXCLUDED_FROM_VISITS)]
        total_visits = len(leads_df)

    if total_visits == 0:
        total_visits = len(df_close)

    closed_deals = len(closed_df)
    gross_closed = closed_deals + len(credit_reject_df)
    closing_rate = (closed_deals / total_visits * 100) if total_visits > 0 else 0
    total_revenue = closed_df['ticket_value'].sum()
    total_commission = closed_df['commission_value'].sum()
    deals_with_value = closed_df[closed_df['ticket_value'] > 0]
    average_ticket = total_revenue / len(deals_with_value) if len(deals_with_value) > 0 else 0
    valid_cp = closed_df[closed_df['commission_percent'] > 0]['commission_percent']
    avg_cp = valid_cp.mean() if len(valid_cp) > 0 else 5.0

    cp_count = len(installed_df)
    cp_amount = installed_df['commission_value'].sum()
    cp_spiff = installed_df['spif_total'].sum()
    pm_df = closed_df[(closed_df['commission_percent'] >= 4.5) & (closed_df['commission_percent'] <= 5.5)]

    # SPIFF breakdown
    spiff_breakdown = {}
    spiff_total = 0.0
    for label, col in [('APCO X','apco_x'),('Samsung','samsung'),('Surge Protector','surge_protector'),('Duct Cleaning','duct_cleaning')]:
        t = closed_df[col].sum()
        c = len(closed_df[closed_df[col] > 0])
        if t > 0 or c > 0:
            spiff_breakdown[label] = {'count': c, 'commission': round(t, 2), 'percent_of_sales': round((c / closed_deals * 100), 1) if closed_deals > 0 else 0}
            spiff_total += t

    mits_total = closed_df['mitsubishi'].sum() + closed_df['self_gen_mits'].sum()
    mits_count = len(closed_df[(closed_df['mitsubishi'] > 0) | (closed_df['self_gen_mits'] > 0)])
    if mits_total > 0 or mits_count > 0:
        spiff_breakdown['Mitsubishi'] = {'count': mits_count, 'commission': round(mits_total, 2), 'percent_of_sales': round((mits_count / closed_deals * 100), 1) if closed_deals > 0 else 0}
        spiff_total += mits_total

    # SPIFF records per brand
    spiff_records = {}
    for label, col in [('APCO X','apco_x'),('Samsung','samsung'),('Surge Protector','surge_protector'),('Duct Cleaning','duct_cleaning')]:
        brand_df = closed_df[closed_df[col] > 0]
        if len(brand_df) > 0:
            spiff_records[label] = [{'name': str(r.get('name','')), 'city': str(r.get('city','')) if pd.notna(r.get('city')) else '',
                'unit_type': str(r.get('unit_type','')) if pd.notna(r.get('unit_type')) else '',
                'ticket_value': safe_float(r.get('ticket_value',0)), 'spiff_value': safe_float(r.get(col,0)),
                'close_date': r.get('close_date').strftime('%Y-%m-%d') if pd.notna(r.get('close_date')) else ''} for _, r in brand_df.iterrows()]
    mits_df = closed_df[(closed_df['mitsubishi'] > 0) | (closed_df['self_gen_mits'] > 0)]
    if len(mits_df) > 0:
        spiff_records['Mitsubishi'] = [{'name': str(r.get('name','')), 'city': str(r.get('city','')) if pd.notna(r.get('city')) else '',
            'unit_type': str(r.get('unit_type','')) if pd.notna(r.get('unit_type')) else '',
            'ticket_value': safe_float(r.get('ticket_value',0)), 'spiff_value': round(safe_float(r.get('mitsubishi',0)) + safe_float(r.get('self_gen_mits',0)), 2),
            'close_date': r.get('close_date').strftime('%Y-%m-%d') if pd.notna(r.get('close_date')) else ''} for _, r in mits_df.iterrows()]

    # Follow-ups
    follow_ups = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    fu_df = (df[df['follow_up_date'].notna() & (df['status'] != 'SALE') & df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en)].copy()
             if start_date and en else df[df['follow_up_date'].notna() & (df['status'] != 'SALE')].copy())
    for _, row in fu_df.iterrows():
        fd = row.get('follow_up_date')
        if pd.notna(fd):
            vd = row.get('visit_date')
            follow_ups.append({
                'lead_id': str(row.get('lead_id', '')) if pd.notna(row.get('lead_id', None)) else '',
                'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number', None)) else '',
                'name': str(row.get('name', '')), 'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
                'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
                'status': str(row.get('status', '')),
                'follow_up_date': fd.strftime('%Y-%m-%d'), 'days_until': (fd - today).days,
                'is_urgent': (fd - today).days <= 7,
                'visit_date': vd.strftime('%Y-%m-%d') if pd.notna(vd) else '',
                'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
                'ticket_value': safe_float(row.get('ticket_value', 0)),
                'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
                'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
                'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
                'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
            })
    follow_ups.sort(key=lambda x: x.get('follow_up_date', '9999'))

    # Unit type stats
    ut_count, ut_rev = {}, {}
    for _, r in closed_df.iterrows():
        u = str(r.get('unit_type', 'Unknown')).strip() or 'Unknown'
        ut_count[u] = ut_count.get(u, 0) + 1
        ut_rev[u] = ut_rev.get(u, 0) + safe_float(r.get('ticket_value', 0))

    status_dist = {'SALE': len(closed_df), 'LOST': len(lost_df), 'PENDING': len(pending_df),
        'CREDIT_REJECT': len(credit_reject_df), 'CANCEL_APPOINTMENT': len(cancel_df), 'RESCHEDULED': len(rescheduled_df)}

    # Monthly data
    monthly = {}
    for _, r in closed_df.iterrows():
        d = r.get('install_date') or r.get('close_date')
        if d and pd.notna(d):
            try:
                k = (int(d.year), int(d.month))
                if k not in monthly: monthly[k] = {'revenue': 0, 'deals': 0, 'commission': 0}
                monthly[k]['revenue'] += safe_float(r.get('ticket_value', 0))
                monthly[k]['deals'] += 1
                monthly[k]['commission'] += safe_float(r.get('commission_value', 0))
            except: pass
    mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    monthly_data = [{'month': f"{mn[m-1]} {y}", 'month_short': mn[m-1], 'year': y, 'revenue': round(v['revenue'],2), 'deals': v['deals'], 'commission': round(v['commission'],2)} for (y,m), v in sorted(monthly.items())]

    # Records
    records = []
    for _, r in installed_df.head(50).iterrows():
        records.append({
            'lead_id': str(r.get('lead_id', '')) if pd.notna(r.get('lead_id', None)) else '',
            'customer_number': str(r.get('customer_number', '')) if pd.notna(r.get('customer_number', None)) else '',
            'name': str(r.get('name', '')), 'city': str(r.get('city', '')) if pd.notna(r.get('city')) else '',
            'address': str(r.get('address', '')) if pd.notna(r.get('address')) else '',
            'unit_type': str(r.get('unit_type', '')) if pd.notna(r.get('unit_type')) else '',
            'ticket_value': safe_float(r.get('ticket_value', 0)), 'commission_percent': safe_float(r.get('commission_percent', 0)),
            'commission_value': safe_float(r.get('commission_value', 0)), 'spif_total': safe_float(r.get('spif_total', 0)),
            'status': str(r.get('status', '')),
            'visit_date': r.get('visit_date').strftime('%Y-%m-%d') if pd.notna(r.get('visit_date')) else '',
            'close_date': r.get('close_date').strftime('%Y-%m-%d') if pd.notna(r.get('close_date')) else '',
            'install_date': r.get('install_date').strftime('%Y-%m-%d') if pd.notna(r.get('install_date')) else '',
            'email': str(r.get('email', '')) if pd.notna(r.get('email')) else '',
        })

    pp_data = []
    for pn, ps, pe in PAY_PERIODS:
        pdf = df[df['install_date'].notna() & (df['install_date'] >= ps) & (df['install_date'] <= pe) & (df['status'] == 'SALE')]
        pp_data.append({'name': pn, 'deals': len(pdf), 'revenue': pdf['ticket_value'].sum()})

    return {
        "total_revenue": round(total_revenue, 2), "total_commission": round(total_commission, 2),
        "closed_deals": closed_deals, "gross_closed": gross_closed, "closing_rate": round(closing_rate, 1),
        "total_visits": total_visits, "average_ticket": round(average_ticket, 2),
        "commission_payment_count": cp_count, "commission_payment_revenue": round(installed_df['ticket_value'].sum(), 2),
        "commission_payment_amount": round(cp_amount, 2), "commission_payment_spiff": round(cp_spiff, 2),
        "price_margin_total": round(pm_df['ticket_value'].sum(), 2),
        "price_margin_sales_count": len(pm_df),
        "price_margin_commission": round(pm_df['commission_value'].sum(), 2),
        "spiff_total": round(spiff_total, 2), "spiff_breakdown": spiff_breakdown, "spiff_records": spiff_records,
        "follow_ups": follow_ups, "avg_commission_percent": round(avg_cp, 2),
        "unit_type_count": ut_count, "unit_type_revenue": ut_rev,
        "monthly_data": monthly_data, "status_distribution": status_dist,
        "records": records, "pay_periods": pp_data, "selected_pay_period": pay_period,
        "cancel_count": len(cancel_df), "rescheduled_count": len(rescheduled_df), "credit_reject_count": len(credit_reject_df),
    }
