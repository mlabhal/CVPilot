export interface SlideType {
    id: number;
    title: string;
    subtitle: string;
    imageSrc: string;
    ctaText: string;
    ctaLink: string;
  }
  
  export interface FeatureType {
    id: number;
    icon: React.ReactNode;
    title: string;
    description: string;
  }