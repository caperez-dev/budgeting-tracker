import React from 'react';
import {
  Briefcase,
  Gift,
  Laptop,
  CircleDollarSign,
  Car,
  Utensils,
  Heart,
  FolderKanban,
  CreditCard,
  Tag,
  ShoppingBag,
  Coffee,
  Home,
  Zap,
  Film,
  Dumbbell,
  Plane,
  BookOpen,
  Music,
  Smile,
  Shield,
  Smartphone,
  Sparkles,
  Wallet,
  Banknote,
  Landmark,
  PiggyBank,
  Coins,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Gift,
  Laptop,
  CircleDollarSign,
  Car,
  Utensils,
  Heart,
  FolderKanban,
  CreditCard,
  Tag,
  ShoppingBag,
  Coffee,
  Home,
  Zap,
  Film,
  Dumbbell,
  Plane,
  BookOpen,
  Music,
  Smile,
  Shield,
  Smartphone,
  Sparkles,
  Wallet,
  Banknote,
  Landmark,
  PiggyBank,
  Coins,
  Receipt,
};

interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({ name, className = 'w-4 h-4', style }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} style={style} />;
}

export function AccountIcon({ name, className = 'w-4 h-4', style }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || Wallet;
  return <IconComponent className={className} style={style} />;
}
