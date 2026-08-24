/**
 * Content for /learn — structured data, no layout. Every {placeholder} in a
 * paragraph is filled from runModel() output at render time in
 * LearnPage.tsx — never a stored number. Fill paragraphs (and
 * glossaryEntries) in place; no component needs to change for that.
 */

export interface LearnSection {
  id: string
  heading: string
  /** One string per paragraph. Empty = not written yet. {key} tokens are filled at render time. */
  paragraphs: string[]
}

export const learnSections: LearnSection[] = [
  {
    id: 'what-is-an-lbo',
    heading: 'What is a leveraged buyout?',
    paragraphs: [
      "A leveraged buyout is the purchase of a company where most of the price is paid with borrowed money rather than the buyer's own cash. The debt sits with the acquired company, and the cash the business generates is what repays it. The buyer — in this industry called the sponsor — typically contributes between a fifth and a third of the purchase price as equity and borrows the rest.",
      'Sponsors look for businesses that can carry that debt: steady cash generation, limited exposure to economic cycles, and room to improve. They hold the company for roughly three to five years, use that time to grow earnings and pay down debt, and then sell — to another investor, to a strategic buyer, or through a listing. What they are aiming for is an annual return on their equity in the low-to-mid twenties.',
      'Everything on this page is calculated live by the same model that runs the calculator. Change nothing and you are looking at the default deal: a company with EBITDA of {ebitda0} bought at {entryMultiple} times earnings for {enterpriseValue}, held {holdPeriod} years, sold at the same multiple.',
    ],
  },
  {
    id: 'the-leverage-effect',
    heading: 'Why borrowing changes the return',
    paragraphs: [
      'Here is the same company, bought twice. Same growth, same holding period, same exit multiple. The only difference is how much of the purchase price was borrowed.',
      "The business performed identically in both cases. What differs is who owns the gain. Lenders are entitled to their interest and their principal, and nothing beyond that — their upside is capped by contract. Every franc of value created above that belongs to the equity. Put in less equity, and the same gain is spread over a smaller base.",
      'There is a second effect that is easy to miss. Interest is deductible before tax, so borrowing lowers the tax bill. In the levered case above, interest in the first year is {interestY1}, which at a {taxRate} tax rate saves {taxShieldY1} in cash. Practitioners call this the tax shield.',
    ],
  },
  {
    id: 'where-returns-come-from',
    heading: 'The three sources of return',
    paragraphs: [
      "Any gain on the sponsor's equity can be traced to exactly three things. The value creation bridge in the calculator separates them, and the split says a great deal about the quality of a deal.",
      'Earnings growth. The company generates more EBITDA at exit than at entry, so the same multiple buys a larger price. In the default deal this contributes {bridgeEbitdaGrowth}. This is the source sponsors talk about most, because it is the one they can claim credit for.',
      'Multiple expansion. The buyer at exit pays a higher multiple than the sponsor paid at entry. In the default deal, entry and exit multiples are identical, so this contributes {bridgeMultipleChange}. Modelling a higher exit multiple is easy and tempting; defending the assumption in an investment committee is not. Deals that need multiple expansion to work are usually deals that do not work.',
      "Deleveraging. The company's cash flow repays debt, so more of the enterprise value belongs to the equity at exit than at entry. In the default deal this contributes {bridgeDeleveraging}. It requires no operational improvement at all — only that the business keeps generating cash.",
      'A sponsor whose returns come mostly from the third source has, strictly speaking, made money without making the company better. The market has taken note: since the era of cheap debt ended, earnings growth has become the source that investors actually reward.',
    ],
  },
  {
    id: 'where-the-risk-sits',
    heading: 'The same leverage, in reverse',
    paragraphs: [
      'Leverage is symmetric. It magnifies losses exactly as it magnifies gains, and it does so under a constraint that equity does not have: the interest is due whether the business is doing well or not.',
      'Take the default deal and assume revenue declines by twenty percent a year for three consecutive years instead of growing. EBITDA falls by half over the hold period, but the debt does not fall with it — and what is left of the enterprise value belongs increasingly to the lenders.',
      'At the lower level of debt the deal loses money but the equity survives largely intact. At the higher level two thirds of it are gone — not because the business disappeared, but because the claim ahead of it did not shrink. Note what the numbers do NOT show: the company never runs out of cash. It keeps paying down debt throughout. What destroys the return is not a liquidity crisis but the simple arithmetic of a smaller business carrying the same obligations. This is why lenders write covenants on leverage rather than waiting for a missed payment, and why the leverage a deal can carry is set by the stability of its cash flow rather than by what the model can be made to show.',
    ],
  },
  {
    id: 'why-timing-matters',
    heading: 'Why the exit year matters',
    paragraphs: [
      'Two numbers describe a return, and they can point in opposite directions. The money multiple asks how many times the sponsor got its money back. The IRR asks at what annual rate the money compounded. A longer hold usually improves the first and damages the second.',
      'The longer hold returns more money in total and a lower return per year. Which one a sponsor optimises for depends on what it is being measured on — and fund managers are measured on both, which is why exit timing is argued about as hard as entry price.',
    ],
  },
  {
    id: 'glossary',
    heading: 'Terms used on this site',
    paragraphs: [],
  },
]

export interface GlossaryEntry {
  term: string
  explanation: string
}

export const glossaryEntries: GlossaryEntry[] = [
  {
    term: 'Amortisation',
    explanation:
      'Scheduled repayment of principal during the life of a loan. A loan with no amortisation repays everything at maturity and is called a bullet.',
  },
  {
    term: 'Capex',
    explanation:
      'Capital expenditure. Money spent on plant, equipment and other long-lived assets. It reduces cash but not profit directly; depreciation does that over time.',
  },
  {
    term: 'Cash sweep',
    explanation:
      'A clause requiring the company to use surplus cash to repay debt early rather than accumulate it. It shortens the life of the loan and reduces total interest.',
  },
  {
    term: 'Covenant',
    explanation:
      'A condition in a loan agreement, usually a financial ratio the borrower must stay within. Breaching one gives lenders the right to intervene, renegotiate, or demand repayment.',
  },
  {
    term: 'EBITDA',
    explanation:
      'Earnings before interest, tax, depreciation and amortisation. A rough proxy for the cash a business produces from operations, used because it is unaffected by how the business is financed.',
  },
  {
    term: 'Enterprise value',
    explanation:
      'What the whole business is worth, debt and equity together. In this model it is EBITDA multiplied by the valuation multiple.',
  },
  {
    term: 'Exit',
    explanation:
      'The sale of the investment. Usually to another financial buyer, a strategic acquirer, or through a public listing.',
  },
  {
    term: 'IRR',
    explanation:
      "Internal rate of return. The annual compound rate at which the sponsor's equity grew, taking the timing of every cash flow into account.",
  },
  {
    term: 'Leverage',
    explanation:
      'The amount of debt in a deal, quoted either as a share of the purchase price or as a multiple of EBITDA. Five times EBITDA is a common upper bound for a stable business.',
  },
  {
    term: 'Money multiple',
    explanation:
      'Equity at exit divided by equity invested. A multiple of 2.5 means the sponsor got two and a half times its money back. It ignores how long that took.',
  },
  {
    term: 'Net debt',
    explanation: 'Debt less cash. This is what is deducted from enterprise value to arrive at what the equity is worth.',
  },
  {
    term: 'PIK interest',
    explanation:
      'Interest that is not paid in cash but added to the loan balance instead. It preserves liquidity while the debt grows, and it is charged at a higher rate for exactly that reason.',
  },
  {
    term: 'Sponsor',
    explanation:
      'The private equity firm making the investment. It supplies the equity, arranges the debt, and controls the company until exit.',
  },
  {
    term: 'Tranche',
    explanation:
      'One layer of the debt structure. Senior tranches are repaid first and carry the lowest interest; junior and mezzanine tranches rank behind them and are priced higher for that risk.',
  },
  {
    term: 'Working capital',
    explanation:
      'Cash tied up in inventory and unpaid customer invoices, less what the company owes suppliers. Growth consumes it, which is why a growing business can be profitable and short of cash at the same time.',
  },
]
