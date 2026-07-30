import { Link } from "wouter";
import { BookHeart, Sparkles, Printer, BookOpen, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-full mb-6">
            <BookOpen className="w-4 h-4" /> Personalized AI Storybooks
          </span>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.05] mb-6">
            Your child is{" "}
            <span className="text-primary">the main character</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Upload a photo and we'll create a story with a cartoon character
            inspired by your child — their name woven into every page, their
            milestones celebrated, their values reflected.
          </p>

          <ol className="flex flex-col items-center gap-3 mb-10 text-left max-w-xs mx-auto">
            {["Attach their photo", "Tell us about them", "Get their story in seconds"].map((step, i) => (
              <li key={step} className="flex items-center gap-3 w-full">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground font-medium">{step}</span>
              </li>
            ))}
          </ol>

          <Link href="/sign-up">
            <button className="px-10 py-4 bg-primary text-white font-bold text-lg rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Create their story →
            </button>
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
                icon: Sparkles,
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
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
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

          <div className="flex flex-col gap-6">
            {/* Pay per story */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-md text-left">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-serif font-bold text-foreground">$1</span>
                <span className="text-muted-foreground">/story</span>
              </div>
              <p className="text-muted-foreground text-sm mb-5">Pay as you go — no commitment</p>
              <ul className="space-y-3 mb-7">
                {[
                  "One personalized story",
                  "AI illustrations with reference photos",
                  "Bible verse integration",
                  "Downloadable PDF",
                  "Print & ship from $25 per book",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-foreground">
                    <Star className="w-4 h-4 text-primary flex-shrink-0 fill-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up">
                <button className="w-full py-3 bg-muted border border-border text-foreground font-bold text-base rounded-full hover:bg-muted/70 transition-all">
                  Get started
                </button>
              </Link>
            </div>

            {/* Subscription */}
            <div className="bg-primary rounded-3xl p-8 shadow-md text-left relative overflow-hidden">
              <span className="absolute top-4 right-4 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">Best value</span>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-serif font-bold text-white">$3.33</span>
                <span className="text-white/70">/month</span>
              </div>
              <p className="text-white/70 text-sm mb-5">Unlimited story generation</p>
              <ul className="space-y-3 mb-7">
                {[
                  "Unlimited personalized stories",
                  "AI illustrations with reference photos",
                  "Bible verse integration",
                  "Downloadable & printable PDFs",
                  "Print & ship from $25 per book",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white">
                    <Star className="w-4 h-4 text-accent flex-shrink-0 fill-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up">
                <button className="w-full py-3 bg-white text-primary font-bold text-base rounded-full hover:bg-white/90 transition-all">
                  Subscribe — $3.33/mo
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">Sion Legacy Originals</span>
        </div>
        <p>© {new Date().getFullYear()} Sion Legacy Originals. All rights reserved.</p>
      </footer>
    </div>
  );
}
