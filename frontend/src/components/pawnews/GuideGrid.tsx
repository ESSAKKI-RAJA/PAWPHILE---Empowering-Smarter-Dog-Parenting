
import GuideCard from "./GuideCard";
import type { CareGuide } from "../../data/careGuides";

export default function GuideGrid({ guides }: { guides: CareGuide[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((g) => (
        <GuideCard key={g.id} guide={g} />
      ))}
    </div>
  );
}
