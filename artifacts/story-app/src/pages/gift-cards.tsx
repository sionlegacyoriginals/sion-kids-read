import { Link } from "wouter";
import { Gift, ArrowLeft, Check, ArrowRight } from "lucide-react";

const TIERS = [
  {
    label: "One Story",
    price: "$1.00",
    description: "A single personalized story",
    perks: ["One AI-illustrated story", "Reference photo support", "Downloadable PDF"],
    url: "https://buy.stripe.com/aFa9AT2se0HUdVG2OtdQQ05",
    highlight: false,
  },
  {
    label: "One Month",
    price: "$8.88",
    description: "Unlimited stories for 30 days",
    perks: ["Unlimited stories for 30 days", "Reference photo support", "Downloadable PDFs", "Bible verse integration"],
    url: "https://buy.stripe.com/00wbJ15Eq3U618UfBfdQQ02",
    highlight: true,
  },
  {
    label: "Six Months",
    price: "$44.44",
    description: "Unlimited stories for 6 months",
    perks: ["Unlimited stories for 180 days", "Reference photo support", "Downloadable PDFs", "Bible verse integration"],
    url: "https://buy.stripe.com/aFa28raYK62e5pacp3dQQ03",
    highlight: false,
  },
  {
    label: "Twelve Months",
    price: "$77.77",
    description: "A full year of unlimited stories",
    perks: ["Unlimited stories for 365 days", "Reference photo support", "Downloadable PDFs", "Bible verse integration"],
    url: "https://buy.stripe.com/fZu4gzgj462eg3OfBfdQQ04",
    highlight: false,
  },
  {
    label: "Printed Book",
    price: "$33.33",
    description: "A printed & shipped personalized storybook",
    perks: ["One 6\"×9\" softcover printed book", "Personalized AI illustrations", "Ships directly to their door", "No extra work required"],
    url: "https://buy.stripe.com/aFa4gz2se0HU04Q2OtdQQ06",
    highlight: false,
  },
];

export default function GiftCards() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4">

      <Link href="/create">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Gift className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Give the gift of stories</h1>
        <p className="text-muted-foreground text-sm">
          You'll receive a gift code to share at the perfect moment — the recipient redeems it when they're ready.
        </p>
      </div>

      {/* Tiers */}
      <div className="space-y-3">
        {TIERS.map((tier) => (
          <a
            key={tier.label}
            href={tier.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block rounded-2xl border p-5 transition-all hover:shadow-md group ${
              tier.highlight
                ? "border-primary bg-primary/5 hover:bg-primary/8"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{tier.label}</span>
                  {tier.highlight && (
                    <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-serif font-bold text-foreground">{tier.price}</span>
              </div>
            </div>
            <ul className="space-y-1 mb-3">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-1 text-primary text-xs font-bold group-hover:gap-2 transition-all">
              Buy gift card <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>
        ))}
      </div>

      {/* Redeem link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Received a gift card?</p>
        <Link href="/gift-card/redeem">
          <span className="text-primary font-semibold hover:underline cursor-pointer text-sm">
            Redeem it here →
          </span>
        </Link>
      </div>

    </div>
  );
}
