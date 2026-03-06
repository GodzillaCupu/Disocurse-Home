import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";

export default class GasingHomepage extends Component {
  @service currentUser;
  @service router;

  @tracked trendingTopics = [];
  @tracked latestTopics = [];
  @tracked newsTopics = [];
  @tracked materiTopics = [];
  @tracked activeTab = "trending";
  @tracked isLoading = true;

  constructor() {
    super(...arguments);
    this.fetchAllData();
  }

  get displayName() {
    if (this.currentUser) {
      return this.currentUser.name || this.currentUser.username;
    }
    return "Pengunjung";
  }

  get isLoggedIn() {
    return !!this.currentUser;
  }

  get visibleTopics() {
    if (this.activeTab === "trending") {
      return this.trendingTopics;
    }
    return this.latestTopics;
  }

  @action
  switchTab(tab) {
    this.activeTab = tab;
  }

  mapTopics(topics) {
    return (topics || []).map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt || "",
      likeCount: t.like_count || 0,
      replyCount: t.posts_count ? t.posts_count - 1 : 0,
      tags: t.tags || [],
      imageUrl: t.image_url || null,
      createdAt: t.created_at,
    }));
  }

  async fetchAllData() {
    try {
      const [trendingRes, latestRes] = await Promise.allSettled([
        ajax("/top/weekly.json?per_page=5"),
        ajax("/latest.json?per_page=5"),
      ]);

      if (trendingRes.status === "fulfilled" && trendingRes.value?.topic_list?.topics) {
        this.trendingTopics = this.mapTopics(trendingRes.value.topic_list.topics.slice(0, 5));
      }

      if (latestRes.status === "fulfilled" && latestRes.value?.topic_list?.topics) {
        this.latestTopics = this.mapTopics(latestRes.value.topic_list.topics.slice(0, 5));
      }

      // Optional category fetches - these might fail if categories don't exist
      const [newsRes, materiRes] = await Promise.allSettled([
        ajax("/c/gasing-academy-news/l/latest.json?per_page=3"),
        ajax("/c/materi-gasing/l/latest.json?per_page=5"),
      ]);

      if (newsRes.status === "fulfilled" && newsRes.value?.topic_list?.topics) {
        this.newsTopics = this.mapTopics(newsRes.value.topic_list.topics.slice(0, 3));
      }

      if (materiRes.status === "fulfilled" && materiRes.value?.topic_list?.topics) {
        this.materiTopics = this.mapTopics(materiRes.value.topic_list.topics.slice(0, 5));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("GasingHomepage: Error loading data", e);
    } finally {
      this.isLoading = false;
    }
  }
}
