/**
 * All user-visible strings live here so a future translation can be added
 * without touching component code. Code, comments and commits stay in
 * English regardless.
 */
export const en = {
  app: {
    title: 'LBO Simulator',
    tagline: 'Move a lever, watch the return — and the risk — move with it.',
  },
  resultBar: {
    irr: 'IRR',
    moneyMultiple: 'Multiple',
    entryLeverage: 'Entry leverage',
    exitLeverage: 'Exit leverage',
    covenantOk: 'No covenant breach',
    covenantBreach: 'Covenant breach',
    covenantsPending: 'No covenants configured yet',
  },
  tombstone: {
    heading: 'This transaction',
    entryMultiple: 'Entry multiple',
    enterpriseValue: 'Enterprise value',
    equityInvested: 'Equity invested',
    holdPeriod: 'Hold period',
    exitMultiple: 'Exit multiple',
    years: 'years',
  },
  controls: {
    transactionGroup: 'Transaction',
    financingGroup: 'Financing',
    operatingGroup: 'Operating plan',
    exitGroup: 'Exit',
    entryMultiple: 'Entry multiple',
    ltmEbitda: 'LTM EBITDA',
    debtMultiple: 'Debt (× EBITDA)',
    interestRate: 'Interest rate',
    amortizationPct: 'Scheduled amortization (% p.a.)',
    cashSweepPct: 'Cash sweep participation',
    revenueGrowth: 'Revenue growth (p.a.)',
    ebitdaMargin: 'EBITDA margin',
    taxRate: 'Tax rate',
    daPctRevenue: 'D&A (% of revenue)',
    capexPctRevenue: 'Capex (% of revenue)',
    workingCapitalPct: 'Working capital (% of revenue growth)',
    holdPeriodYears: 'Hold period (years)',
    exitMultiple: 'Exit multiple',
    exitEqualsEntry: 'Same as entry multiple',
    adjustedTo: 'Adjusted to',
  },
  sourcesUses: {
    title: 'Sources & Uses',
    uses: 'Uses',
    sources: 'Sources',
    equityPurchasePrice: 'Equity purchase price',
    refinanceTargetDebt: 'Refinance target net debt',
    transactionCosts: 'Transaction costs',
    minCashFunding: 'Minimum cash funded',
    debtTranches: 'Debt tranches',
    sponsorEquity: 'Sponsor equity',
    total: 'Total',
  },
  charts: {
    deleveraging: {
      title: 'Deleveraging',
      subtitle: 'Debt balance and leverage over the hold period',
    },
    valueSplit: {
      title: 'Enterprise value split',
      subtitle: 'Net debt vs. equity — the growing equity wedge is the point of an LBO',
      netDebt: 'Net debt',
      equity: 'Equity',
    },
    valueBridge: {
      title: 'Value creation bridge',
      subtitle: 'From entry equity to exit equity',
      entryEquity: 'Entry equity',
      ebitdaGrowth: 'EBITDA growth',
      multipleChange: 'Multiple change',
      deleveraging: 'Deleveraging & other',
      exitEquity: 'Exit equity',
    },
  },
  warnings: {
    heading: 'Warnings',
  },
  learn: {
    title: 'How it works',
    tableOfContents: 'Sections',
    contentPending: 'Content pending',
    seeAlsoMethodology: 'For exact formulas and conventions, see',
    leverageCompare: {
      noDebtLabel: '0% debt',
      debtLabel: '55% debt',
    },
  },
  methodology: {
    seeAlsoLearn: 'For why the mechanics matter, not just how they compute, see',
  },
  saved: {
    title: 'Saved',
  },
  nav: {
    brand: 'LBO Simulator',
    menuToggle: 'Menu',
  },
  theme: {
    switchToDark: 'Dark mode',
    switchToLight: 'Light mode',
  },
  share: {
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    copyFailed: 'Could not copy — select the address bar instead',
  },
  units: {
    years: 'yrs',
    x: '×',
  },
} as const
