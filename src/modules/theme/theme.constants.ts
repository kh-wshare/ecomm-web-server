export type ThemeConfig = {
  preset?: 'minimal' | 'bold' | 'elegant';
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  layout: {
    productGridColumns: number;
    showHero: boolean;
    borderRadius?: 'none' | 'small' | 'medium' | 'large';
    spacing?: 'compact' | 'comfortable' | 'spacious';
  };
  hero?: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections?: Array<{
    id: string;
    type:
      | 'hero'
      | 'productGrid'
      | 'featuredCollection'
      | 'socialFeed'
      | 'contactForm'
      | 'footer';
    enabled: boolean;
  }>;
  featuredCollection?: { title?: string };
  socialFeed?: { title?: string };
  contactForm?: { title?: string };
  footer?: { text?: string };
  storefront?: {
    seoTitle?: string;
    seoDescription?: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  preset: 'minimal',
  colors: {
    primary: '#111827',
    accent: '#2563eb',
    background: '#ffffff',
    text: '#111827',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  layout: {
    productGridColumns: 4,
    showHero: true,
    borderRadius: 'medium',
    spacing: 'comfortable',
  },
  hero: {
    title: 'Welcome to our store',
    subtitle: 'Discover products selected for you.',
  },
  sections: [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'product-grid', type: 'productGrid', enabled: true },
    {
      id: 'featured-collection',
      type: 'featuredCollection',
      enabled: true,
    },
    { id: 'social-feed', type: 'socialFeed', enabled: false },
    { id: 'contact-form', type: 'contactForm', enabled: false },
    { id: 'footer', type: 'footer', enabled: true },
  ],
  featuredCollection: { title: 'Featured collection' },
  socialFeed: { title: 'Follow our story' },
  contactForm: { title: 'Get in touch' },
  footer: { text: 'Thank you for visiting.' },
  storefront: {
    seoTitle: '',
    seoDescription: '',
    logoUrl: '',
    faviconUrl: '',
  },
};

const colorSchema = {
  type: 'string',
  pattern: '^#[0-9a-fA-F]{6}$',
} as const;

export const THEME_CONFIG_SCHEMA = {
  $id: 'merchant-theme-config',
  type: 'object',
  additionalProperties: false,
  required: ['colors', 'typography', 'layout'],
  properties: {
    preset: {
      type: 'string',
      enum: ['minimal', 'bold', 'elegant'],
    },
    colors: {
      type: 'object',
      additionalProperties: false,
      required: ['primary', 'accent', 'background', 'text'],
      properties: {
        primary: colorSchema,
        accent: colorSchema,
        background: colorSchema,
        text: colorSchema,
      },
    },
    typography: {
      type: 'object',
      additionalProperties: false,
      required: ['headingFont', 'bodyFont'],
      properties: {
        headingFont: { type: 'string', minLength: 1, maxLength: 80 },
        bodyFont: { type: 'string', minLength: 1, maxLength: 80 },
      },
    },
    layout: {
      type: 'object',
      additionalProperties: false,
      required: ['productGridColumns', 'showHero'],
      properties: {
        productGridColumns: {
          type: 'integer',
          minimum: 1,
          maximum: 6,
        },
        showHero: { type: 'boolean' },
        borderRadius: {
          type: 'string',
          enum: ['none', 'small', 'medium', 'large'],
        },
        spacing: {
          type: 'string',
          enum: ['compact', 'comfortable', 'spacious'],
        },
      },
    },
    hero: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', maxLength: 120 },
        subtitle: { type: 'string', maxLength: 300 },
        imageUrl: { type: 'string', maxLength: 2048 },
      },
    },
    sections: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'enabled'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
          },
          type: {
            type: 'string',
            enum: [
              'hero',
              'productGrid',
              'featuredCollection',
              'socialFeed',
              'contactForm',
              'footer',
            ],
          },
          enabled: { type: 'boolean' },
        },
      },
    },
    featuredCollection: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', maxLength: 120 },
      },
    },
    socialFeed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', maxLength: 120 },
      },
    },
    contactForm: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', maxLength: 120 },
      },
    },
    footer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: 300 },
      },
    },
    storefront: {
      type: 'object',
      additionalProperties: false,
      properties: {
        seoTitle: { type: 'string', maxLength: 70 },
        seoDescription: { type: 'string', maxLength: 160 },
        logoUrl: { type: 'string', maxLength: 2048 },
        faviconUrl: { type: 'string', maxLength: 2048 },
      },
    },
  },
} as const;
