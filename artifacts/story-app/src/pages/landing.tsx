import { Link } from "wouter";
import { BookHeart, Printer, BookOpen, Star, Gift, GraduationCap, Users, KeyRound, BookMarked } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent pointer-events-none" />
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-full mb-6">
            <BookOpen className="w-4 h-4" /> Personalized AI Storybooks
          </span>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.05] mb-6">
            Your Child Is{" "}
            <span className="text-primary">The Main Character</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Upload a photo and we'll bring your child to life as an animated
            character in their own story — their names woven into every page,
            their milestones celebrated, their values reflected.
          </p>

          <ol className="flex flex-col items-center gap-3 mb-10 text-left max-w-xs mx-auto">
            {["Attach their photos", "Tell us about them", "Get their stories in seconds"].map((step, i) => (
              <li key={step} className="flex items-center gap-3 w-full">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground font-medium">{step}</span>
              </li>
            ))}
          </ol>

          <Link href="/sign-up" className="inline-block px-10 py-4 bg-primary text-white font-bold text-lg rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Create their stories →
          </Link>

        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-foreground mb-14">
            A story as unique as the person in it
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookHeart,
                title: "Fully personalized",
                description:
                  "Stories star anyone by name, age, and personality — kids, teens, adults, even grandparents. Add milestones, memories, or a Bible verse.",
              },
              {
                icon: null,
                title: "AI illustrations",
                description:
                  "Upload a reference photo and our AI paints a custom cover and two interior illustrations tailored to your story.",
              },
              {
                icon: Printer,
                title: "Printed & shipped",
                description:
                  "Order a beautiful 6\"×9\" softcover book printed and mailed directly to your door — no extra work for you.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-card rounded-2xl p-8 border border-border/60 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                  {Icon ? <Icon className="w-6 h-6 text-primary" /> : <Logo size={28} />}
                </div>
                <h3 className="font-serif font-bold text-xl text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-full mb-5">
              <GraduationCap className="w-4 h-4" /> For Teachers &amp; Schools
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Bring stories into your classroom
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Create a class, add your students by first name only — no emails, no passwords to manage —
              and let them log in with a simple class code and 4-digit PIN.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { icon: GraduationCap, step: "1", title: "Create a class", desc: "Sign up as a teacher and create your class in seconds. You get a unique 5-letter code like SION7." },
              { icon: Users,         step: "2", title: "Add students", desc: "Type each student's first name. They get an emoji avatar and a 4-digit PIN — no emails required." },
              { icon: KeyRound,      step: "3", title: "Share the code", desc: "Write your class code on the board. Students tap \"Student Login,\" type the code, and pick their name." },
              { icon: BookMarked,    step: "4", title: "Read together", desc: "Students see your story library and can read any story you've created — on any device." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative bg-card border border-border/60 rounded-2xl p-6 shadow-sm text-center">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{step}</span>
                <h3 className="font-serif font-bold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Safety callout + CTA */}
          <div className="bg-primary rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-1">
              <h3 className="font-serif font-bold text-2xl text-white mb-2">School Mode included</h3>
              <p className="text-white/80 leading-relaxed">
                Toggle School Mode on and every story is automatically generated with strict
                K-5 G-rated, classroom-safe content rules. Lock it with a 4-digit admin PIN
                so students can't change it.
              </p>
            </div>
            <Link href="/sign-up" className="shrink-0 px-8 py-3.5 bg-white text-primary font-bold rounded-full hover:bg-white/90 transition-all shadow-md text-sm whitespace-nowrap">
              Set up your classroom →
            </Link>
          </div>

          {/* Student entry point below teacher section */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <span className="text-muted-foreground text-sm">Already have a class code from your teacher?</span>
            <Link href="/student-login" className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary/40 text-primary font-bold rounded-full hover:border-primary hover:bg-primary/5 transition-all text-sm">
              <GraduationCap className="w-4 h-4" />
              Student login →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-muted-foreground mb-10">Pay per story or subscribe for unlimited access.</p>

          <div className="flex flex-col gap-4">
            {/* Pay per story */}
            <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm text-left">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif font-bold text-foreground">$1.11</span>
                  <span className="text-muted-foreground">/story</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">Pay as you go — no commitment</p>
              <Link href="/sign-up" className="block w-full py-2.5 bg-muted border border-border text-foreground font-bold text-sm rounded-full hover:bg-muted/70 transition-all text-center">
                Get started
              </Link>
            </div>

            {/* Monthly */}
            <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm text-left">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-serif font-bold text-foreground">$8.88</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground text-sm mb-4">Unlimited stories, cancel anytime</p>
              <Link href="/sign-up" className="block w-full py-2.5 bg-muted border border-border text-foreground font-bold text-sm rounded-full hover:bg-muted/70 transition-all text-center">
                Subscribe monthly
              </Link>
            </div>

            {/* 6 months */}
            <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm text-left">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-serif font-bold text-foreground">$44.44</span>
                <span className="text-muted-foreground">/6 months</span>
              </div>
              <p className="text-muted-foreground text-sm mb-4">Unlimited stories for 6 months</p>
              <Link href="/sign-up" className="block w-full py-2.5 bg-muted border border-border text-foreground font-bold text-sm rounded-full hover:bg-muted/70 transition-all text-center">
                Get 6 months
              </Link>
            </div>

            {/* Yearly — featured */}
            <div className="bg-primary rounded-3xl p-6 shadow-md text-left relative overflow-hidden">
              <span className="absolute top-4 right-4 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">Best value</span>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-serif font-bold text-white">$77.77</span>
                <span className="text-white/70">/year</span>
              </div>
              <p className="text-white/70 text-sm mb-4">Unlimited stories for a full year</p>
              <Link href="/sign-up" className="block w-full py-2.5 bg-white text-primary font-bold text-sm rounded-full hover:bg-white/90 transition-all text-center">
                Get 1 year
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Gift Cards */}
      <section id="gift-cards" className="py-20 px-4 bg-card/50">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Gift className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
            Give the gift of stories
          </h2>
          <p className="text-muted-foreground mb-10">
            A perfect gift for any occasion — let someone else's child be the main character.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "One story",    price: "$1.11",  url: "https://buy.stripe.com/dRm4gz9UGeyKeZKbkZdQQ07" },
              { label: "One month",    price: "$8.88",  url: "https://buy.stripe.com/00wbJ15Eq3U618UfBfdQQ02" },
              { label: "Six months",   price: "$44.44", url: "https://buy.stripe.com/aFa28raYK62e5pacp3dQQ03" },
              { label: "12 months",    price: "$77.77", url: "https://buy.stripe.com/fZu4gzgj462eg3OfBfdQQ04" },
              { label: "Printed book", price: "$33.33", url: "https://buy.stripe.com/aFa4gz2se0HU04Q2OtdQQ06" },
            ].map(({ label, price, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card border border-border/60 hover:border-primary/50 hover:shadow-md rounded-2xl p-5 text-center shadow-sm transition-all hover:-translate-y-0.5"
              >
                <p className="text-2xl font-serif font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{price}</p>
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <p className="text-xs text-primary font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Buy →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">Sion Kids Read</span>
        </div>
        <p>© {new Date().getFullYear()} Sion Kids Read. All rights reserved.</p>
        <div className="mt-3">
          <Link href="/gift-card/redeem">
            <span className="text-primary font-semibold hover:underline cursor-pointer">
              Redeem a gift card
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
