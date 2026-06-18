export interface ProductPublisher {
  id: number
  username: string
  avatar_url: string | null
  email: string | null
  created_at: string | null
}

export interface ProductListItem {
  id: number
  name: string
  summary: string
  cover_url: string
  product_type: '礼盒' | '助农' | '匠心'
  producer: string | null
  list_category: string
  primary_category: string
  sort_order: number
  created_at: string | null
  publisher: ProductPublisher | null
  tags: string[]
}

export interface ProductDetail extends ProductListItem {
  origin: string | null
  process_text: string | null
  detail_html: string | null
  gallery: { url: string; sort_order: number }[]
  flow_steps: {
    step_order: number
    image_url: string
    caption: string | null
  }[]
}

export interface HomePayload {
  intro: {
    videos: { id: number; video_url: string; cover_url: string; title: string }[]
    ppts: { id: number; image_url: string; title: string }[]
    text_html: string
    video_cover: string
    ppt_slides: string[]
  }
  banners: {
    id: number
    title: string
    image_url: string
    link_type: string
    link_value: string
    has_detail?: boolean
  }[]
  highlights: { id: number; icon: string; title: string; summary: string; image_url?: string }[]
}

export interface ColorOption {
  id: number
  dimension_code: string
  name: string
}

export interface ExperienceItem {
  id: number
  name: string
  cover_url: string
  region: string
  location: string
  time_note: string
  duration_note: string
  badge: string | null
  badge_color: string | null
  summary: string
}

export interface CultureArticle {
  id: number
  title: string
  cover_url: string
  summary: string
  list_no: number | null
}

export interface TaskBrief {
  id: number
  name: string
  cover_url: string
  difficulty: string
  deadline_note: string
  status_label: string
  summary?: string
}
