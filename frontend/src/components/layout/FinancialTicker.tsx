import React from 'react';

export const FinancialTicker: React.FC = () => {
  const biokraftCompanyFacts = [
    { label: 'COMPANY', value: 'BioKraft Foods Pvt Ltd', isHighlight: true },
    { label: 'LISTING', value: 'Private / Unlisted', isTag: true },
    { label: 'FY25 REVENUE', value: '₹7.0L' },
    { label: 'FY25 EXPENSES', value: '₹22.0L' },
    { label: 'FY25 PAT', value: '–₹15.1L', isNegative: true },
    { label: 'FY25 TOTAL ASSETS', value: '₹10.6L' },
    { label: 'PRE-SEED FUNDING', value: '₹2 Cr' },
    { label: 'INVESTOR', value: 'GVFL' },
    { label: 'AUTHORISED CAPITAL', value: '₹40L' },
    { label: 'PAID-UP CAPITAL', value: '₹20.13L' },
    { label: 'INCORPORATED', value: '10 Jul 2023' },
  ];

  const renderTickerContent = (keyPrefix: string) => (
    <div key={keyPrefix} className="flex items-center gap-6 shrink-0 font-mono text-[11px] tracking-wider uppercase">
      {biokraftCompanyFacts.map((item, index) => (
        <React.Fragment key={`${keyPrefix}-${index}`}>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[#E7FE6F] font-bold">{item.label}:</span>
            <span
              className={`font-semibold ${
                item.isNegative
                  ? 'text-[#FF8080]'
                  : item.isHighlight
                  ? 'text-white font-bold'
                  : item.isTag
                  ? 'text-[#E7FE6F] bg-[#E7FE6F]/10 px-1.5 py-0.5 rounded-[2px] border border-[#E7FE6F]/30 text-[10px]'
                  : 'text-[#F5F5F0]'
              }`}
            >
              {item.value}
            </span>
          </div>
          <span className="text-[#E7FE6F] text-[10px] select-none">•</span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="h-9 bg-[#111111] text-[#F5F5F0] border-b border-[#262624] flex items-center overflow-hidden relative select-none z-20">
      {/* Inline CSS animation for smooth ticker marquee */}
      <style>{`
        @keyframes biokraftTicker {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-biokraft-ticker {
          display: flex;
          width: max-content;
          animation: biokraftTicker 40s linear infinite;
        }
        .animate-biokraft-ticker:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-biokraft-ticker {
            animation: none;
          }
        }
      `}</style>

      {/* Static Label Badge */}
      <div className="px-3 h-full bg-[#111111] border-r border-[#262624] flex items-center shrink-0 z-10 font-mono text-[10px] font-bold text-[#E7FE6F] uppercase tracking-widest gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E7FE6F] animate-pulse" />
        COMPANY BRIEF
      </div>

      {/* Scrolling Ticker Track */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div className="animate-biokraft-ticker flex items-center gap-6">
          {renderTickerContent('track-1')}
          {renderTickerContent('track-2')}
        </div>
      </div>
    </div>
  );
};

