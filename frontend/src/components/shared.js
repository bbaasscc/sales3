import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BRAND_COLORS } from "@/lib/constants";

export const SummaryCard = ({ title, value, description, icon: Icon, prefix = "", suffix = "", highlight = false }) => (
  <Card 
    className={`bg-white border shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'border-l-4' : 'border-gray-200'}`}
    style={{ borderLeftColor: highlight ? BRAND_COLORS.primary : undefined }}
    data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-3 sm:p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <div className="p-1 sm:p-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: BRAND_COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 font-heading truncate">
              {title}
            </p>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-semibold tracking-tight text-gray-900 mt-1 sm:mt-2">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: prefix === '$' ? 2 : 0, maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 leading-relaxed line-clamp-2">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const SectionHeader = ({ title, description, icon: Icon }) => (
  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
    <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: BRAND_COLORS.primary }}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 font-heading">{title}</h2>
      <p className="text-xs sm:text-sm text-gray-500 truncate">{description}</p>
    </div>
  </div>
);

export const SpiffBrandCard = ({ brand, data, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
        <span className="font-semibold text-gray-700 text-sm sm:text-base truncate">{brand}</span>
      </div>
      <span className="text-[10px] sm:text-xs font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-gray-600 flex-shrink-0">
        {data.percent_of_sales}%
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Sales</p>
        <p className="text-base sm:text-lg font-mono font-semibold text-gray-900">{data.count}</p>
      </div>
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Commission</p>
        <p className="text-base sm:text-lg font-mono font-semibold" style={{ color: BRAND_COLORS.primary }}>${data.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  </div>
);

export const ChartCard = ({ title, description, children, icon: Icon }) => (
  <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
    <CardHeader className="pb-2 border-b border-gray-100 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" strokeWidth={1.5} />}
        <div className="min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 font-heading">{title}</CardTitle>
          {description && <CardDescription className="text-[10px] sm:text-xs text-gray-400 truncate">{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 md:p-5">
      {children}
    </CardContent>
  </Card>
);
