import { GraduationCap } from "lucide-react";
import { ClassroomSection } from "@/components/classroom-section";

export default function ClassroomSetup() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">School Hub Setup</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create classes, add students by first name, and share class codes — no student emails needed.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">How it works</h2>
        <ol className="space-y-2 text-sm text-foreground">
          <li className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span><strong>Create a class</strong> — give it a name and you'll get a unique 5-letter code (e.g. <span className="font-mono font-bold">SION7</span>).</span>
          </li>
          <li className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span><strong>Add students</strong> by first name only — each gets an emoji avatar and a 4-digit PIN automatically.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span><strong>Share the class code</strong> with your class. Students go to the Student Login, type the code, tap their name, and enter their PIN.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span><strong>Students see your story library</strong> and can read any story you've created — no subscriptions or emails required on their end.</span>
          </li>
        </ol>
      </div>

      <ClassroomSection />
    </div>
  );
}
