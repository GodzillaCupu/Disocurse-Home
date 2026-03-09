import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import getURL from "discourse-common/lib/get-url";

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
    this.fetchAllData();
  }

  // ─── Asset URLs (served from Discourse's theme asset pipeline) ────────────
  // Discourse exposes theme assets at:
  //   /theme-javascripts/<theme-id>/... or via the `theme_uploads` helper.
  // The reliable cross-version way is to use the `themePrefix` registered in
  // about.json as the `assets` map.  The key in the map becomes a CSS variable
  // AND a global JS variable: `settings.theme_uploads.<key>`.
  //
  // In Glimmer components the safest method is to construct the path via the
  // known Discourse theme-upload URL pattern:
  //   /uploads/default/original/...
  // BUT since we can't know the hash at build-time, we rely on Discourse's
  // built-in `__theme_upload_url` function injected into the theme JS scope.
  // If that is unavailable we fall back to the `getURL` helper with a known path.

  get mascotCreativityUrl() {
    return this._themeAssetUrl("mascot_creativity");
  }

  get mascotLogicUrl() {
    return this._themeAssetUrl("mascot_logic");
  }

  get mascotCommunicationUrl() {
    return this._themeAssetUrl("mascot_communication");
  }

  _themeAssetUrl(key) {
    // `__theme_upload_url` is injected by Discourse into the theme JS bundle.
    // eslint-disable-next-line no-undef
    if (typeof __theme_upload_url === "function") {
      // eslint-disable-next-line no-undef
      return __theme_upload_url(key);
    }
    // Fallback: settings.theme_uploads is populated by Discourse for theme components
    if (
      typeof settings !== "undefined" &&
      settings.theme_uploads &&
      settings.theme_uploads[key]
    ) {
      return getURL(settings.theme_uploads[key]);
    }
    return "";
  }

  // ─── User ─────────────────────────────────────────────────────────────────
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
    return this.activeTab === "trending"
      ? this.trendingTopics
      : this.latestTopics;
  }

  @action
  switchTab(tab) {
    this.activeTab = tab;
  }

  // ─── Data ─────────────────────────────────────────────────────────────────
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

      if (
        trendingRes.status === "fulfilled" &&
        trendingRes.value?.topic_list?.topics
      ) {
        this.trendingTopics = this.mapTopics(
          trendingRes.value.topic_list.topics.slice(0, 5),
        );
      }

      if (
        latestRes.status === "fulfilled" &&
        latestRes.value?.topic_list?.topics
      ) {
        this.latestTopics = this.mapTopics(
          latestRes.value.topic_list.topics.slice(0, 5),
        );
      }

      const [newsRes, materiRes] = await Promise.allSettled([
        ajax("/c/gasing-academy-news/l/latest.json?per_page=3"),
        ajax("/c/materi-gasing/l/latest.json?per_page=5"),
      ]);

      if (newsRes.status === "fulfilled" && newsRes.value?.topic_list?.topics) {
        this.newsTopics = this.mapTopics(
          newsRes.value.topic_list.topics.slice(0, 3),
        );
      }

      if (
        materiRes.status === "fulfilled" &&
        materiRes.value?.topic_list?.topics
      ) {
        this.materiTopics = this.mapTopics(
          materiRes.value.topic_list.topics.slice(0, 5),
        );
      }
    } catch (e) {
      console.error("GasingHomepage: Error loading data", e);
    } finally {
      this.isLoading = false;
    }
  }
}
