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
            <Sparkles className="w-4 h-4" /> AI-Powered Children's Stories
          </span>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.05] mb-6">
            Bedtime stories <br />
            <span className="text-primary">made for your child</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Generate personalised, beautifully illustrated children's stories in seconds.
            Upload a photo, pick a theme, and watch the magic unfold.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <button className="px-8 py-4 bg-primary text-white font-bold text-lg rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Start your free story →
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-8 py-4 bg-card border border-border text-foreground font-bold text-lg rounded-full hover:bg-muted/50 transition-all">
                Sign in
              </button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            First story free · No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-foreground mb-14">
            Everything your little one deserves
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookHeart,
                title: "Fully personalised",
                description:
                  "Stories star your child by name, age, and personality. Add milestones, special memories, or a Bible verse.",
              },
              {
                icon: Sparkles,
                title: "AI illustrations",
                description:
                  "Upload a reference photo and our AI paints a custom cover and two interior illustrations that look like your child.",
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
          <p className="text-muted-foreground mb-10">Your first story is always free.</p>

          <div className="bg-card border border-border/60 rounded-3xl p-10 shadow-md">
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-5xl font-serif font-bold text-foreground">$3.33</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-muted-foreground text-sm mb-8">Unlimited story generation</p>
            <ul className="space-y-3 text-left mb-10">
              {[
                "Unlimited personalised stories",
                "AI illustrations with reference photos",
                "Bible verse integration",
                "Downloadable & printable PDFs",
                "Print & ship from $25 per book",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-foreground">
                  <Star className="w-4 h-4 text-primary flex-shrink-0 fill-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/sign-up">
              <button className="w-full py-4 bg-primary text-white font-bold text-lg rounded-full hover:bg-primary/90 transition-all">
                Get started free
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">StoryBloom</span>
        </div>
        <p>© {new Date().getFullYear()} StoryBloom. All rights reserved.</p>
      </footer>
    </div>
  );
}
