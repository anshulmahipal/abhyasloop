import {
  type LucideIcon,
  Landmark,
  BookOpen,
  Briefcase,
  GraduationCap,
  Shield,
  Train,
  Building2,
  FileText,
  Award,
  Users,
  FolderOpen,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  landmark: Landmark,
  bookopen: BookOpen,
  book: BookOpen,
  briefcase: Briefcase,
  graduationcap: GraduationCap,
  graduation: GraduationCap,
  shield: Shield,
  train: Train,
  railway: Train,
  building2: Building2,
  building: Building2,
  filetext: FileText,
  file: FileText,
  award: Award,
  users: Users,
  banking: Landmark,
  upsc: GraduationCap,
  ssc: FileText,
  defence: Shield,
  default: FolderOpen,
};

export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName || typeof iconName !== "string") return iconMap.default;
  const key = iconName.toLowerCase().replace(/\s+/g, "");
  return iconMap[key] ?? iconMap.default;
}
