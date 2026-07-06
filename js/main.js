(function () {
  const heroMedia = document.getElementById("hero-media");
  const topbar = document.getElementById("topbar");
  const gallery = document.getElementById("gallery");
  const navLinks = document.getElementById("nav-links");
  const itemCount = document.getElementById("item-count");
  const themeToggle = document.getElementById("theme-toggle");
  const lightbox = document.getElementById("lightbox");
  const lightboxContent = document.getElementById("lightbox-content");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");

  const categories = [
    { id: "editorial", label: "Editorial" },
    { id: "beauty", label: "Beauty" },
    { id: "portrait", label: "Portrait" },
    { id: "press", label: "Press & Runway" },
    { id: "video", label: "Film" },
  ];

  const categoryLabels = Object.fromEntries(
    categories.map((c) => [c.id, c.label])
  );

  const HERO_IMAGE = "media/IMG_6465.JPG";

  let allItems = [];
  let visibleItems = [];
  let currentIndex = 0;
  let currentFilter = "all";

  document.getElementById("year").textContent = new Date().getFullYear();

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.filter = cat.id;
    btn.textContent = cat.label;
    navLinks.appendChild(btn);
  });

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    setTheme(next);
  });

  window.addEventListener("scroll", () => {
    topbar.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  function encodePath(name) {
    return name.split("/").map((s) => encodeURIComponent(s)).join("/");
  }

  function setHeroImage(items) {
    const exists = items.some((i) => i.name === HERO_IMAGE);
    const pick = exists
      ? HERO_IMAGE
      : items.find((i) => i.type === "image" && i.category === "portrait")?.name ||
        items.find((i) => i.type === "image")?.name;

    if (pick && heroMedia) {
      heroMedia.style.backgroundImage = `url("${encodePath(pick)}")`;
      heroMedia.style.backgroundPosition = "center 30%";
    }
  }

  function getFilteredItems() {
    if (currentFilter === "all") return allItems;
    return allItems.filter((item) => item.category === currentFilter);
  }

  function updateCount() {
    const total = allItems.length;
    const shown = visibleItems.length;
    if (currentFilter === "all") {
      itemCount.textContent = `${total} pieces`;
      return;
    }
    itemCount.textContent = `${shown} · ${categoryLabels[currentFilter] || currentFilter}`;
  }

  function createGalleryItem(item, index) {
    const el = document.createElement("article");
    el.className = "gallery-item";
    el.dataset.type = item.type;

    const src = encodePath(item.name);
    const label = categoryLabels[item.category] || "View";

    if (item.type === "video") {
      el.innerHTML = `
        <video src="${src}" muted preload="metadata" playsinline></video>
        <span class="play-icon"></span>
        <div class="gallery-item-overlay"><span class="gallery-item-label">${label}</span></div>
      `;
      const video = el.querySelector("video");
      video.addEventListener("loadeddata", () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      });
    } else {
      el.innerHTML = `
        <img src="${src}" alt="${label}" loading="lazy" decoding="async">
        <div class="gallery-item-overlay"><span class="gallery-item-label">${label}</span></div>
      `;
    }

    el.addEventListener("click", () => openLightbox(index));
    return el;
  }

  function createDivider(label, count) {
    const el = document.createElement("div");
    el.className = "gallery-divider";
    el.innerHTML = `<span>${label}</span><small>${String(count).padStart(2, "0")}</small>`;
    return el;
  }

  function renderGallery() {
    visibleItems = getFilteredItems();
    gallery.innerHTML = "";
    gallery.classList.remove("is-empty");

    if (visibleItems.length === 0) {
      gallery.innerHTML = '<p class="loading">No work in this category</p>';
      gallery.classList.add("is-empty");
      updateCount();
      return;
    }

    if (currentFilter === "all") {
      categories.forEach((cat) => {
        const items = visibleItems.filter((item) => item.category === cat.id);
        if (!items.length) return;

        gallery.appendChild(createDivider(cat.label, items.length));
        items.forEach((item) => {
          const index = visibleItems.indexOf(item);
          gallery.appendChild(createGalleryItem(item, index));
        });
      });
    } else {
      visibleItems.forEach((item, index) => {
        gallery.appendChild(createGalleryItem(item, index));
      });
    }

    updateCount();
  }

  function openLightbox(index) {
    currentIndex = index;
    showLightboxItem();
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lightboxContent.querySelector("video")?.pause();
    lightboxContent.innerHTML = "";
  }

  function showLightboxItem() {
    const item = visibleItems[currentIndex];
    if (!item) return;

    lightboxContent.innerHTML = "";
    const src = encodePath(item.name);
    const label = categoryLabels[item.category] || "";

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      lightboxContent.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.alt = label;
      lightboxContent.appendChild(img);
    }

    lightboxCaption.textContent = `${currentIndex + 1} / ${visibleItems.length}${label ? " — " + label : ""}`;
  }

  function navigateLightbox(dir) {
    currentIndex = (currentIndex + dir + visibleItems.length) % visibleItems.length;
    showLightboxItem();
  }

  navLinks.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    navLinks.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderGallery();

    const bar = document.getElementById("filters-bar");
    const top = bar.getBoundingClientRect().top + window.scrollY - 10;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
  lightboxNext.addEventListener("click", () => navigateLightbox(1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });

  function initGallery(items) {
    allItems = items || [];
    if (!allItems.length) {
      gallery.innerHTML = '<p class="loading">No media found</p>';
      return;
    }
    setHeroImage(allItems);
    renderGallery();
  }

  if (window.MEDIA_ITEMS?.length) {
    initGallery(window.MEDIA_ITEMS);
  } else {
    fetch("media.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => initGallery(d.items))
      .catch(() => {
        gallery.innerHTML = '<p class="error">Could not load gallery</p>';
      });
  }
})();
