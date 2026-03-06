import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";

export default class GasingHomepage extends Component {
  @service currentUser;
  @service router;
  @service siteSettings;

  @tracked trendingTopics = [];
  @tracked latestTopics = [];
  @tracked newsTopics = [];
  @tracked materiTopics = [];
  @tracked activeTab = "trending";
  @tracked isLoading = true;

  constructor() {
    super(...arguments);
    this.loadData();
  }

  get username() {
    return this.currentUser?.username || "Pengunjung";
  }

  get displayName() {
    return this.currentUser?.name || this.currentUser?.username || "Pengunjung";
  }

  get userAvatarUrl() {
    if (!this.currentUser) return null;
    const template = this.currentUser.avatar_template;
    return template ? template.replace("{size}", "120") : null;
  }

  get isLoggedIn() {
    return !!this.currentUser;
  }

  @action
  switchTab(tab) {
    this.activeTab = tab;
  }

  async loadData() {
    try {
      // Fetch trending topics (most liked)
      const trending = await ajax("/top/weekly.json?per_page=5");
      if (trending?.topic_list?.topics) {
        this.trendingTopics = trending.topic_list.topics.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt || "",
          likeCount: t.like_count || 0,
          replyCount: t.posts_count ? t.posts_count - 1 : 0,
          posters: t.posters || [],
          categoryId: t.category_id,
          relativeAge: t.bumped_at,
          tags: t.tags || [],
        }));
      }

      // Fetch latest topics
      const latest = await ajax("/latest.json?per_page=5");
      if (latest?.topic_list?.topics) {
        this.latestTopics = latest.topic_list.topics.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt || "",
          likeCount: t.like_count || 0,
          replyCount: t.posts_count ? t.posts_count - 1 : 0,
          posters: t.posters || [],
          categoryId: t.category_id,
          relativeAge: t.bumped_at,
          tags: t.tags || [],
        }));
      }

      // Fetch news category topics (change category slug as needed)
      try {
        const news = await ajax("/c/gasing-academy-news/l/latest.json?per_page=3");
        if (news?.topic_list?.topics) {
          this.newsTopics = news.topic_list.topics.slice(0, 3).map((t) => ({
            id: t.id,
            title: t.title,
            slug: t.slug,
            excerpt: t.excerpt || "",
            imageUrl: t.image_url || null,
            createdAt: t.created_at,
          }));
        }
      } catch (e) {
        // Category might not exist yet
        console.log("News category not found, skipping...");
      }

      // Fetch materi/learning topics
      try {
        const materi = await ajax("/c/materi-gasing/l/latest.json?per_page=5");
        if (materi?.topic_list?.topics) {
          this.materiTopics = materi.topic_list.topics.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            slug: t.slug,
            excerpt: t.excerpt || "",
            likeCount: t.like_count || 0,
            replyCount: t.posts_count ? t.posts_count - 1 : 0,
            tags: t.tags || [],
          }));
        }
      } catch (e) {
        console.log("Materi category not found, skipping...");
      }
    } catch (e) {
      console.error("Error loading homepage data:", e);
    } finally {
      this.isLoading = false;
    }
  }
}
