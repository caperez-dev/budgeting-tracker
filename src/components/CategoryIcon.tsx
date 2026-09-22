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
import { BANK_LOGOS_MAP } from '../data/bankLogos';

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
  if (!name) {
    return <Wallet className={className} style={style} />;
  }

  // 1. Custom uploaded image (Data URI, object URL, or remote URL)
  if (name.startsWith('data:image/') || name.startsWith('blob:') || name.startsWith('http')) {
    return (
      <img
        src={name}
        alt="Account icon"
        className={`${className} object-contain rounded-[3px]`}
        style={style}
      />
    );
  }

  // 2. Real-life Bank / Payment logo
  if (BANK_LOGOS_MAP[name]) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        {BANK_LOGOS_MAP[name].render('w-full h-full')}
      </span>
    );
  }

  // 3. Lucide Icon
  const IconComponent = ICON_MAP[name] || Wallet;
  return <IconComponent className={className} style={style} />;
}
