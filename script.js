"use strict";

/* ================================================================
   KERALA ONAM — INTERACTIVE WEBSITE
   script.js
   ================================================================ */

const ONAM = {
    storage: {
        likes: "keralaOnam.likes.v2",
        liked: "keralaOnam.liked.v2",
        comments: "keralaOnam.comments.v2",
        memories: "keralaOnam.memories.v2",
        musicVolume: "keralaOnam.musicVolume.v2"
    },

    canvas: {
        width: 800,
        height: 800,
        maxHistory: 35,
        defaultColor: "#F4C430",
        defaultSize: 12
    },

    gallery: {
        selector: ".photo-card, .pookolam-photo-card"
    },

    scroll: {
        headerOffset: 85,
        revealThreshold: 0.12
    },

    rain: {
        count: 42
    },

    memoryImage: {
        maxWidth: 900,
        maxHeight: 900,
        quality: 0.78,
        maxDataURLLength: 900000
    }
};

/* ================================================================
   GLOBAL STATE
   ================================================================ */

const state = {
    menuOpen: false,

    gallery: {
        items: [],
        index: 0,
        previousFocus: null
    },

    drawing: {
        canvas: null,
        ctx: null,
        drawing: false,
        color: ONAM.canvas.defaultColor,
        size: ONAM.canvas.defaultSize,
        tool: "brush",
        history: [],
        historyIndex: -1,
        lastPoint: null
    },

    music: {
        audio: null,
        playing: false
    },

    memoryImage: {
        dataURL: "",
        fileName: ""
    }
};

/* ================================================================
   SAFE HELPERS
   ================================================================ */

function $(selector, root = document) {
    try {
        return root.querySelector(selector);
    } catch (error) {
        console.warn("Invalid selector:", selector, error);
        return null;
    }
}

function $$(selector, root = document) {
    try {
        return Array.from(root.querySelectorAll(selector));
    } catch (error) {
        console.warn("Invalid selector:", selector, error);
        return [];
    }
}

function safeJSON(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        return safeJSON(value, fallback);
    } catch (error) {
        console.warn("Local storage read failed:", error);
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;
    } catch (error) {
        console.warn(
            "Local storage write failed:",
            error
        );

        showToast(
            "Your browser could not save this locally.",
            "warning"
        );

        return false;
    }
}

function escapeHTML(value) {
    const div = document.createElement("div");

    div.textContent = String(value ?? "");

    return div.innerHTML;
}

function formatTime(seconds) {
    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        Math.floor(seconds % 60);

    return `${minutes}:${String(
        remaining
    ).padStart(2, "0")}`;
}

function clamp(value, min, max) {
    return Math.min(
        max,
        Math.max(min, value)
    );
}

function prefersReducedMotion() {
    return (
        window.matchMedia &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    );
}

/* ================================================================
   TOAST SYSTEM
   ================================================================ */

function getToastContainer() {
    let container =
        $("#onamToastContainer");

    if (!container) {
        container =
            document.createElement("div");

        container.id =
            "onamToastContainer";

        container.className =
            "toast-container";

        container.setAttribute(
            "aria-live",
            "polite"
        );

        container.setAttribute(
            "aria-atomic",
            "true"
        );

        document.body.appendChild(
            container
        );
    }

    return container;
}

function showToast(
    message,
    type = "success"
) {
    const container =
        getToastContainer();

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;

    toast.setAttribute(
        "role",
        "status"
    );

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    requestAnimationFrame(() => {
        toast.classList.add(
            "show"
        );
    });

    window.setTimeout(() => {
        toast.classList.remove(
            "show"
        );

        window.setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

/* ================================================================
   PAGE LOADER
   ================================================================ */

function initializePageLoader() {
    const loader =
        $("#pageLoader");

    if (!loader) {
        return;
    }

    const finish = () => {
        window.setTimeout(() => {
            loader.classList.add(
                "loaded"
            );

            loader.setAttribute(
                "aria-hidden",
                "true"
            );
        }, prefersReducedMotion()
            ? 0
            : 500);
    };

    if (
        document.readyState ===
        "complete"
    ) {
        finish();
    } else {
        window.addEventListener(
            "load",
            finish,
            { once: true }
        );

        window.setTimeout(
            finish,
            2500
        );
    }
}

/* ================================================================
   NAVIGATION
   ================================================================ */

function setNavigation(open) {
    const menuButton =
        $("#menuToggle");

    const navigation =
        $("#mainNavigation");

    const overlay =
        $("#navigationOverlay");

    if (
        !menuButton ||
        !navigation
    ) {
        return;
    }

    state.menuOpen =
        Boolean(open);

    navigation.classList.toggle(
        "open",
        state.menuOpen
    );

    if (overlay) {
        overlay.classList.toggle(
            "visible",
            state.menuOpen
        );

        overlay.setAttribute(
            "aria-hidden",
            String(!state.menuOpen)
        );
    }

    menuButton.classList.toggle(
        "active",
        state.menuOpen
    );

    menuButton.setAttribute(
        "aria-expanded",
        String(state.menuOpen)
    );

    menuButton.setAttribute(
        "aria-label",
        state.menuOpen
            ? "Close navigation menu"
            : "Open navigation menu"
    );

    document.body.classList.toggle(
        "menu-open",
        state.menuOpen
    );

    document.body.style.overflow =
        state.menuOpen
            ? "hidden"
            : "";
}

function initializeNavigation() {
    const menuButton =
        $("#menuToggle");

    const navigation =
        $("#mainNavigation");

    const overlay =
        $("#navigationOverlay");

    if (
        !menuButton ||
        !navigation
    ) {
        console.warn(
            "Onam navigation could not be initialized."
        );

        return;
    }

    menuButton.addEventListener(
        "click",
        event => {
            event.stopPropagation();

            setNavigation(
                !state.menuOpen
            );
        }
    );

    if (overlay) {
        overlay.addEventListener(
            "click",
            () => {
                setNavigation(false);
            }
        );
    }

    $$(".nav-link", navigation)
        .forEach(link => {
            link.addEventListener(
                "click",
                () => {
                    setNavigation(false);
                }
            );
        });

    document.addEventListener(
        "click",
        event => {
            if (!state.menuOpen) {
                return;
            }

            if (
                !navigation.contains(
                    event.target
                ) &&
                !menuButton.contains(
                    event.target
                )
            ) {
                setNavigation(false);
            }
        }
    );

    window.addEventListener(
        "resize",
        () => {
            if (
                window.innerWidth > 1000 &&
                state.menuOpen
            ) {
                setNavigation(false);
            }
        }
    );
}

/* ================================================================
   SMOOTH SCROLLING
   ================================================================ */

function scrollToTarget(target) {
    if (!target) {
        return;
    }

    const top =
        target.getBoundingClientRect()
            .top +
        window.scrollY -
        ONAM.scroll.headerOffset;

    window.scrollTo({
        top: Math.max(0, top),
        behavior:
            prefersReducedMotion()
                ? "auto"
                : "smooth"
    });
}

function initializeSmoothScrolling() {
    $$('a[href^="#"]')
        .forEach(link => {
            link.addEventListener(
                "click",
                event => {
                    const href =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !href ||
                        href === "#"
                    ) {
                        return;
                    }

                    let target;

                    try {
                        target =
                            document.querySelector(
                                href
                            );
                    } catch {
                        return;
                    }

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    scrollToTarget(
                        target
                    );

                    if (state.menuOpen) {
                        setNavigation(
                            false
                        );
                    }
                }
            );
        });
}

/* ================================================================
   HEADER / SCROLL PROGRESS / BACK TO TOP
   ================================================================ */

function updateScrollUI() {
    const header =
        $("#siteHeader");

    const backTop =
        $("#backToTop");

    const progress =
        $("#scrollProgress");

    const scrollY =
        window.scrollY ||
        window.pageYOffset;

    if (header) {
        header.classList.toggle(
            "scrolled",
            scrollY > 50
        );
    }

    if (backTop) {
        backTop.classList.toggle(
            "visible",
            scrollY > 650
        );
    }

    if (progress) {
        const total =
            document.documentElement
                .scrollHeight -
            window.innerHeight;

        const percentage =
            total > 0
                ? (scrollY / total) * 100
                : 0;

        progress.style.width =
            `${clamp(
                percentage,
                0,
                100
            )}%`;
    }
}

function initializeScrollUI() {
    let ticking = false;

    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(
                () => {
                    updateScrollUI();
                    ticking = false;
                }
            );

            ticking = true;
        }
    };

    window.addEventListener(
        "scroll",
        onScroll,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        updateScrollUI
    );

    if (!$("#scrollProgress")) {
        const progress =
            document.createElement(
                "div"
            );

        progress.id =
            "scrollProgress";

        progress.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.appendChild(
            progress
        );
    }

    updateScrollUI();
}

function initializeBackToTop() {
    const button =
        $("#backToTop");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            window.scrollTo({
                top: 0,
                behavior:
                    prefersReducedMotion()
                        ? "auto"
                        : "smooth"
            });
        }
    );
}

/* ================================================================
   ACTIVE NAVIGATION
   ================================================================ */

function initializeActiveNavigation() {
    const sectionIDs = [
        "#home",
        "#about-onam",
        "#kerala",
        "#memories",
        "#pookolam",
        "#videos",
        "#music",
        "#share-memory"
    ];

    const sections =
        sectionIDs
            .map(id => $(id))
            .filter(Boolean);

    const links =
        $$(".nav-link");

    if (
        !sections.length ||
        !links.length
    ) {
        return;
    }

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(
                    entry => {
                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        const id =
                            entry.target.id;

                        links.forEach(
                            link => {
                                link.classList.toggle(
                                    "active",
                                    link.getAttribute(
                                        "href"
                                    ) ===
                                    `#${id}`
                                );
                            }
                        );
                    }
                );
            },
            {
                threshold: 0.15,

                rootMargin:
                    "-25% 0px -55% 0px"
            }
        );

    sections.forEach(
        section => {
            observer.observe(
                section
            );
        }
    );
}

/* ================================================================
   SCROLL REVEAL
   ================================================================ */

function initializeRevealAnimations() {
    const selectors = [
        ".intro-card",
        ".photo-card",
        ".pookolam-photo-card",
        ".video-card",
        ".nature-feature",
        ".section-heading",
        ".drawing-panel",
        ".drawing-controls",
        ".music-player",
        ".share-introduction",
        ".memory-form-container",
        ".shared-memories"
    ];

    const elements =
        $$(selectors.join(","));

    if (!elements.length) {
        return;
    }

    if (
        prefersReducedMotion() ||
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        elements.forEach(
            element => {
                element.classList.add(
                    "visible",
                    "revealed",
                    "active"
                );
            }
        );

        return;
    }

    elements.forEach(
        element => {
            element.classList.add(
                "scroll-reveal"
            );
        }
    );

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(
                    entry => {
                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        entry.target.classList.add(
                            "visible",
                            "revealed",
                            "active"
                        );

                        observer.unobserve(
                            entry.target
                        );
                    }
                );
            },
            {
                threshold:
                    ONAM.scroll
                        .revealThreshold,

                rootMargin:
                    "0px 0px -40px 0px"
            }
        );

    elements.forEach(
        element => {
            observer.observe(
                element
            );
        }
    );
}

/* ================================================================
   KERALA MONSOON RAIN
   ================================================================ */

function initializeRain() {
    const container =
        $("#rainContainer");

    if (
        !container ||
        prefersReducedMotion()
    ) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    for (
        let i = 0;
        i < ONAM.rain.count;
        i++
    ) {
        const drop =
            document.createElement(
                "span"
            );

        drop.className =
            "rain-drop";

        drop.style.left =
            `${Math.random() * 100}%`;

        drop.style.animationDelay =
            `${Math.random() * 2.5}s`;

        drop.style.animationDuration =
            `${1.2 +
                Math.random() * 1.8}s`;

        drop.style.opacity =
            `${0.15 +
                Math.random() * 0.35}`;

        fragment.appendChild(
            drop
        );
    }

    container.appendChild(
        fragment
    );
}

/* ================================================================
   GALLERY
   ================================================================ */

function buildGalleryList() {
    state.gallery.items =
        $$(ONAM.gallery.selector);

    state.gallery.items.forEach(
        (item, index) => {
            item.dataset.galleryIndex =
                String(index);

            item.setAttribute(
                "tabindex",
                "0"
            );

            item.setAttribute(
                "role",
                "button"
            );

            const image =
                $("img", item);

            if (
                image &&
                !item.dataset.galleryTitle
            ) {
                const heading =
                    $("h3", item) ||
                    $("h4", item);

                item.dataset.galleryTitle =
                    heading?.textContent
                        .trim() ||
                    image.alt ||
                    `Onam Memory ${
                        index + 1
                    }`;
            }
        }
    );
}

function openGallery(index) {
    const items =
        state.gallery.items;

    if (!items.length) {
        return;
    }

    const normalized =
        (
            (
                index % items.length
            ) +
            items.length
        ) %
        items.length;

    const lightbox =
        $("#imageLightbox");

    if (!lightbox) {
        console.warn(
            "Existing #imageLightbox was not found."
        );

        return;
    }

    state.gallery.index =
        normalized;

    state.gallery.previousFocus =
        document.activeElement;

    updateGallery();

    lightbox.hidden = false;

    lightbox.classList.add(
        "active"
    );

    document.body.classList.add(
        "lightbox-open"
    );

    $("#lightboxClose")?.focus();
}

function updateGallery() {
    const item =
        state.gallery.items[
            state.gallery.index
        ];

    if (!item) {
        return;
    }

    const image =
        $("img", item);

    const lightboxImage =
        $("#lightboxImage");

    const title =
        $("#lightboxTitle");

    const description =
        $("#lightboxDescription");

    const number =
        $("#lightboxNumber");

    if (
        !image ||
        !lightboxImage
    ) {
        return;
    }

    lightboxImage.src =
        image.currentSrc ||
        image.src;

    lightboxImage.alt =
        image.alt ||
        "Onam photograph";

    const heading =
        $("h3", item) ||
        $("h4", item);

    const location =
        $(".photo-location", item);

    if (title) {
        title.textContent =
            heading?.textContent.trim() ||
            image.alt ||
            "Onam Memory";
    }

    if (description) {
        description.textContent =
            location?.textContent.trim() ||
            "A beautiful moment from Kerala.";
    }

    if (number) {
        number.textContent =
            String(
                state.gallery.index + 1
            ).padStart(2, "0");
    }
}

function closeGallery() {
    const lightbox =
        $("#imageLightbox");

    if (!lightbox) {
        return;
    }

    lightbox.classList.remove(
        "active"
    );

    lightbox.hidden = true;

    document.body.classList.remove(
        "lightbox-open"
    );

    if (
        state.gallery.previousFocus &&
        typeof state.gallery
            .previousFocus.focus ===
            "function"
    ) {
        state.gallery.previousFocus.focus();
    }

    state.gallery.previousFocus =
        null;
}

function galleryNext() {
    if (
        !state.gallery.items.length
    ) {
        return;
    }

    state.gallery.index =
        (
            state.gallery.index + 1
        ) %
        state.gallery.items.length;

    updateGallery();
}

function galleryPrevious() {
    if (
        !state.gallery.items.length
    ) {
        return;
    }

    state.gallery.index =
        (
            state.gallery.index -
            1 +
            state.gallery.items.length
        ) %
        state.gallery.items.length;

    updateGallery();
}

function initializeGallery() {
    buildGalleryList();

    state.gallery.items.forEach(
        (item, index) => {
            item.addEventListener(
                "click",
                event => {
                    if (
                        event.target.closest(
                            "button, input, textarea, form, a"
                        )
                    ) {
                        return;
                    }

                    openGallery(index);
                }
            );

            item.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {
                        event.preventDefault();

                        openGallery(
                            index
                        );
                    }
                }
            );
        }
    );

    $$(".view-photo-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    const photoId =
                        button.dataset.photo;

                    const index =
                        state.gallery.items
                            .findIndex(
                                item =>
                                    item.dataset
                                        .photoId ===
                                    photoId
                            );

                    if (index >= 0) {
                        openGallery(
                            index
                        );
                    }
                }
            );
        });

    $("#lightboxClose")
        ?.addEventListener(
            "click",
            closeGallery
        );

    $("#lightboxPrevious")
        ?.addEventListener(
            "click",
            galleryPrevious
        );

    $("#lightboxNext")
        ?.addEventListener(
            "click",
            galleryNext
        );

    $("#imageLightbox")
        ?.addEventListener(
            "click",
            event => {
                if (
                    event.target.id ===
                    "imageLightbox"
                ) {
                    closeGallery();
                }
            }
        );
}

/* ================================================================
   LIKES
   ================================================================ */

function initializeLikes() {
    const counts =
        readStorage(
            ONAM.storage.likes,
            {}
        );

    const liked =
        readStorage(
            ONAM.storage.liked,
            {}
        );

    $$(".like-button")
        .forEach(button => {
            const id =
                button.dataset.photoId;

            if (!id) {
                return;
            }

            const count =
                Number(counts[id]) ||
                0;

            const isLiked =
                Boolean(liked[id]);

            updateLikeButton(
                button,
                count,
                isLiked
            );

            button.addEventListener(
                "click",
                () => {
                    const currentCounts =
                        readStorage(
                            ONAM.storage.likes,
                            {}
                        );

                    const currentLiked =
                        readStorage(
                            ONAM.storage.liked,
                            {}
                        );

                    const current =
                        Number(
                            currentCounts[id]
                        ) || 0;

                    const nextLiked =
                        !Boolean(
                            currentLiked[id]
                        );

                    currentLiked[id] =
                        nextLiked;

                    currentCounts[id] =
                        nextLiked
                            ? current + 1
                            : Math.max(
                                0,
                                current - 1
                            );

                    writeStorage(
                        ONAM.storage.likes,
                        currentCounts
                    );

                    writeStorage(
                        ONAM.storage.liked,
                        currentLiked
                    );

                    updateLikeButton(
                        button,
                        currentCounts[id],
                        nextLiked
                    );

                    showToast(
                        nextLiked
                            ? "💚 Added your like!"
                            : "Like removed."
                    );
                }
            );
        });
}

function updateLikeButton(
    button,
    count,
    liked
) {
    const icon =
        $(".like-icon", button);

    const counter =
        $(".like-count", button);

    if (icon) {
        icon.textContent =
            liked ? "♥" : "♡";
    }

    if (counter) {
        counter.textContent =
            String(count);
    }

    button.classList.toggle(
        "liked",
        liked
    );

    button.setAttribute(
        "aria-pressed",
        String(liked)
    );
}

/* ================================================================
   COMMENTS
   ================================================================ */

function initializeComments() {
    $$(".comment-toggle")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const targetId =
                        button.dataset.target;

                    const area =
                        targetId
                            ? $(`#${targetId}`)
                            : null;

                    if (!area) {
                        return;
                    }

                    const willOpen =
                        area.hidden;

                    area.hidden =
                        !willOpen;

                    button.setAttribute(
                        "aria-expanded",
                        String(
                            willOpen
                        )
                    );

                    if (willOpen) {
                        const input =
                            $("input, textarea", area);

                        input?.focus();

                        renderComments(
                            area.dataset
                                .commentsFor ||
                            targetId.replace(
                                /^comments-/,
                                ""
                            )
                        );
                    }
                }
            );
        });

    $$(".comment-form")
        .forEach(form => {
            form.addEventListener(
                "submit",
                event => {
                    event.preventDefault();

                    const photoId =
                        form.dataset
                            .commentForm;

                    const input =
                        $("input[name='comment'], input, textarea", form);

                    if (
                        !photoId ||
                        !input
                    ) {
                        return;
                    }

                    const text =
                        input.value.trim();

                    if (!text) {
                        showToast(
                            "Write something before posting.",
                            "warning"
                        );

                        input.focus();

                        return;
                    }

                    const comments =
                        readStorage(
                            ONAM.storage.comments,
                            {}
                        );

                    if (
                        !Array.isArray(
                            comments[
                                photoId
                            ]
                        )
                    ) {
                        comments[
                            photoId
                        ] = [];
                    }

                    comments[
                        photoId
                    ].push({
                        text:
                            text.slice(
                                0,
                                200
                            ),

                        date:
                            new Date()
                                .toLocaleDateString(
                                    undefined,
                                    {
                                        day:
                                            "numeric",
                                        month:
                                            "short",
                                        year:
                                            "numeric"
                                    }
                                )
                    });

                    writeStorage(
                        ONAM.storage.comments,
                        comments
                    );

                    input.value = "";

                    renderComments(
                        photoId
                    );

                    showToast(
                        "🌼 Comment added!"
                    );
                }
            );
        });

    $$(".comments-list")
        .forEach(list => {
            const id =
                list.dataset
                    .commentsFor;

            if (id) {
                renderComments(id);
            }
        });
}

function renderComments(
    photoId
) {
    const comments =
        readStorage(
            ONAM.storage.comments,
            {}
        );

    const list =
        $$(
            ".comments-list"
        ).find(
            element =>
                element.dataset
                    .commentsFor ===
                photoId
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    const items =
        Array.isArray(
            comments[photoId]
        )
            ? comments[photoId]
            : [];

    if (!items.length) {
        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "comments-empty";

        empty.textContent =
            "No comments yet — be the first to share!";

        list.appendChild(
            empty
        );

        return;
    }

    items.forEach(
        comment => {
            const article =
                document.createElement(
                    "article"
                );

            article.className =
                "comment-item";

            const avatar =
                document.createElement(
                    "div"
                );

            avatar.className =
                "comment-avatar";

            avatar.textContent =
                "🌼";

            const body =
                document.createElement(
                    "div"
                );

            body.className =
                "comment-body";

            const name =
                document.createElement(
                    "strong"
                );

            name.textContent =
                "Onam Guest";

            const text =
                document.createElement(
                    "p"
                );

            text.textContent =
                comment.text;

            const date =
                document.createElement(
                    "small"
                );

            date.textContent =
                comment.date;

            body.append(
                name,
                text,
                date
            );

            article.append(
                avatar,
                body
            );

            list.appendChild(
                article
            );
        }
    );
}

/* ================================================================
   DIGITAL POOKOLAM
   ================================================================ */

function initializePookolam() {
    const canvas =
        $("#pookolamCanvas");

    if (!canvas) {
        return;
    }

    const ctx =
        canvas.getContext(
            "2d"
        );

    if (!ctx) {
        showToast(
            "Your browser does not support the Pookolam canvas.",
            "error"
        );

        return;
    }

    state.drawing.canvas =
        canvas;

    state.drawing.ctx =
        ctx;

    prepareCanvas();

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    saveDrawingState();

    canvas.style.touchAction =
        "none";

    canvas.addEventListener(
        "pointerdown",
        drawingStart
    );

    canvas.addEventListener(
        "pointermove",
        drawingMove
    );

    canvas.addEventListener(
        "pointerup",
        drawingEnd
    );

    canvas.addEventListener(
        "pointercancel",
        drawingEnd
    );

    canvas.addEventListener(
        "pointerleave",
        drawingEnd
    );

    initializeDrawingControls();
}

function prepareCanvas() {
    const {
        canvas,
        ctx
    } = state.drawing;

    if (!canvas || !ctx) {
        return;
    }

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.imageSmoothingEnabled =
        true;
}

function canvasPoint(event) {
    const canvas =
        state.drawing.canvas;

    const rect =
        canvas.getBoundingClientRect();

    return {
        x:
            (
                event.clientX -
                rect.left
            ) *
            (
                canvas.width /
                rect.width
            ),

        y:
            (
                event.clientY -
                rect.top
            ) *
            (
                canvas.height /
                rect.height
            )
    };
}

function drawingStart(event) {
    const {
        canvas,
        ctx
    } = state.drawing;

    if (!canvas || !ctx) {
        return;
    }

    event.preventDefault();

    try {
        canvas.setPointerCapture(
            event.pointerId
        );
    } catch {
        /* Pointer capture is optional. */
    }

    state.drawing.drawing =
        true;

    const point =
        canvasPoint(event);

    state.drawing.lastPoint =
        point;

    drawDot(point);

    updateDrawingUI();
}

function drawingMove(event) {
    if (
        !state.drawing.drawing
    ) {
        return;
    }

    event.preventDefault();

    const point =
        canvasPoint(event);

    drawLine(
        state.drawing.lastPoint,
        point
    );

    state.drawing.lastPoint =
        point;
}

function drawingEnd() {
    if (
        !state.drawing.drawing
    ) {
        return;
    }

    state.drawing.drawing =
        false;

    state.drawing.lastPoint =
        null;

    saveDrawingState();

    updateDrawingUI();
}

function drawDot(point) {
    const {
        ctx,
        color,
        size,
        tool
    } = state.drawing;

    ctx.save();

    if (
        tool === "eraser"
    ) {
        ctx.globalCompositeOperation =
            "destination-out";

        ctx.fillStyle =
            "rgba(0,0,0,1)";
    } else {
        ctx.globalCompositeOperation =
            "source-over";

        ctx.fillStyle =
            color;
    }

    ctx.beginPath();

    ctx.arc(
        point.x,
        point.y,
        Math.max(
            1,
            size / 2
        ),
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    hideCanvasPlaceholder();
}

function drawLine(
    from,
    to
) {
    const {
        ctx,
        color,
        size,
        tool
    } = state.drawing;

    if (!from || !to) {
        return;
    }

    ctx.save();

    if (
        tool === "eraser"
    ) {
        ctx.globalCompositeOperation =
            "destination-out";

        ctx.strokeStyle =
            "rgba(0,0,0,1)";
    } else {
        ctx.globalCompositeOperation =
            "source-over";

        ctx.strokeStyle =
            color;
    }

    ctx.lineWidth =
        size;

    ctx.beginPath();

    ctx.moveTo(
        from.x,
        from.y
    );

    ctx.lineTo(
        to.x,
        to.y
    );

    ctx.stroke();

    ctx.restore();

    hideCanvasPlaceholder();
}

function hideCanvasPlaceholder() {
    const placeholder =
        $("#canvasPlaceholder");

    if (placeholder) {
        placeholder.classList.add(
            "hidden"
        );
    }
}

function showCanvasPlaceholderIfBlank() {
    const {
        canvas,
        ctx
    } = state.drawing;

    const placeholder =
        $("#canvasPlaceholder");

    if (
        !canvas ||
        !ctx ||
        !placeholder
    ) {
        return;
    }

    const pixels =
        ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        ).data;

    let hasInk = false;

    for (
        let i = 3;
        i < pixels.length;
        i += 4
    ) {
        if (
            pixels[i] !== 0
        ) {
            hasInk = true;
            break;
        }
    }

    placeholder.classList.toggle(
        "hidden",
        hasInk
    );
}

function saveDrawingState() {
    const {
        canvas,
        ctx,
        history
    } = state.drawing;

    if (!canvas || !ctx) {
        return;
    }

    try {
        const snapshot =
            ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

        if (
            state.drawing
                .historyIndex <
            history.length - 1
        ) {
            history.splice(
                state.drawing
                    .historyIndex + 1
            );
        }

        history.push(
            snapshot
        );

        while (
            history.length >
            ONAM.canvas.maxHistory
        ) {
            history.shift();
        }

        state.drawing
            .historyIndex =
            history.length - 1;

    } catch (error) {
        console.warn(
            "Could not save Pookolam history:",
            error
        );
    }
}

function restoreDrawingState(
    snapshot
) {
    const {
        canvas,
        ctx
    } = state.drawing;

    if (
        !canvas ||
        !ctx ||
        !snapshot
    ) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.putImageData(
        snapshot,
        0,
        0
    );

    showCanvasPlaceholderIfBlank();
}

function undoDrawing() {
    const {
        history
    } = state.drawing;

    if (
        state.drawing
            .historyIndex <= 0
    ) {
        showToast(
            "Nothing to undo yet.",
            "warning"
        );

        return;
    }

    state.drawing
        .historyIndex -= 1;

    restoreDrawingState(
        history[
            state.drawing
                .historyIndex
        ]
    );

    updateDrawingUI();

    showToast(
        "↩️ Previous Pookolam restored."
    );
}

function clearDrawing() {
    const {
        canvas,
        ctx
    } = state.drawing;

    if (!canvas || !ctx) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    saveDrawingState();

    showCanvasPlaceholderIfBlank();

    updateDrawingUI();

    showToast(
        "🌿 Pookolam canvas cleared."
    );
}

function downloadPookolam() {
    const canvas =
        state.drawing.canvas;

    if (!canvas) {
        return;
    }

    try {
        const link =
            document.createElement(
                "a"
            );

        link.download =
            `my-onam-pookolam-${Date.now()}.png`;

        link.href =
            canvas.toDataURL(
                "image/png"
            );

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        showToast(
            "🌼 Your Pookolam is ready to save!"
        );

    } catch (error) {
        console.error(
            "Pookolam download failed:",
            error
        );

        showToast(
            "Could not prepare the Pookolam image.",
            "error"
        );
    }
}

function setDrawingTool(
    tool
) {
    state.drawing.tool =
        tool === "eraser"
            ? "eraser"
            : "brush";

    $("#brushTool")
        ?.classList.toggle(
            "active",
            state.drawing.tool ===
                "brush"
        );

    $("#eraserTool")
        ?.classList.toggle(
            "active",
            state.drawing.tool ===
                "eraser"
        );

    updateDrawingUI();
}

function updateDrawingUI() {
    const status =
        $("#drawingStatus");

    if (status) {
        status.textContent =
            state.drawing.tool ===
            "eraser"
                ? "Eraser ready"
                : "Ready";
    }
}

function initializeDrawingControls() {
    $$(".color-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const color =
                        button.dataset
                            .color;

                    if (!color) {
                        return;
                    }

                    state.drawing.color =
                        color;

                    $$(".color-button")
                        .forEach(
                            other => {
                                other.classList.toggle(
                                    "active",
                                    other ===
                                        button
                                );
                            }
                        );

                    setDrawingTool(
                        "brush"
                    );
                }
            );
        });

    const size =
        $("#brushSize");

    size?.addEventListener(
        "input",
        () => {
            state.drawing.size =
                clamp(
                    Number(
                        size.value
                    ) || 12,
                    2,
                    40
                );

            updateDrawingUI();
        }
    );

    $("#brushTool")
        ?.addEventListener(
            "click",
            () => {
                setDrawingTool(
                    "brush"
                );
            }
        );

    $("#eraserTool")
        ?.addEventListener(
            "click",
            () => {
                setDrawingTool(
                    "eraser"
                );
            }
        );

    $("#undoCanvas")
        ?.addEventListener(
            "click",
            undoDrawing
        );

    $("#clearCanvas")
        ?.addEventListener(
            "click",
            clearDrawing
        );

    $("#savePookolam")
        ?.addEventListener(
            "click",
            downloadPookolam
        );

    $("#downloadPookolam")
        ?.addEventListener(
            "click",
            downloadPookolam
        );

    updateDrawingUI();
}

/* ================================================================
   VIDEOS
   ================================================================ */

function initializeVideos() {
    const videos =
        $$("video");

    videos.forEach(
        video => {
            video.preload =
                "metadata";

            video.addEventListener(
                "play",
                () => {
                    videos.forEach(
                        other => {
                            if (
                                other !==
                                video
                            ) {
                                other.pause();
                            }
                        }
                    );
                }
            );

            video.addEventListener(
                "error",
                () => {
                    console.warn(
                        "A video could not be loaded:",
                        video.currentSrc
                    );
                }
            );
        }
    );
}

/* ================================================================
   ONAM MUSIC
   ================================================================ */

function initializeMusic() {
    const audio =
        $("#onamAudio");

    const playButton =
        $("#audioPlayButton");

    const progress =
        $("#audioProgress");

    const volume =
        $("#audioVolume");

    const time =
        $("#audioTime");

    const miniButton =
        $("#musicMiniButton");

    if (!audio) {
        console.warn(
            "Onam audio element not found."
        );

        return;
    }

    state.music.audio =
        audio;

    let savedVolume = NaN;

    try {
        savedVolume =
            Number(
                localStorage.getItem(
                    ONAM.storage
                        .musicVolume
                )
            );
    } catch {
        savedVolume = NaN;
    }

    if (
        Number.isFinite(
            savedVolume
        )
    ) {
        const safeVolume =
            clamp(
                savedVolume,
                0,
                1
            );

        audio.volume =
            safeVolume;

        if (volume) {
            volume.value =
                String(
                    safeVolume
                );
        }
    } else {
        audio.volume = 1;
    }

    const updateMusicUI =
        () => {
            const isPlaying =
                !audio.paused;

            state.music.playing =
                isPlaying;

            if (playButton) {
                playButton.textContent =
                    isPlaying
                        ? "❚❚"
                        : "▶";

                playButton.setAttribute(
                    "aria-label",
                    isPlaying
                        ? "Pause Onam music"
                        : "Play Onam music"
                );

                playButton.classList.toggle(
                    "playing",
                    isPlaying
                );
            }

            if (miniButton) {
                const status =
                    $(".music-status", miniButton);

                if (status) {
                    status.textContent =
                        isPlaying
                            ? "Playing"
                            : "Music";
                }

                miniButton.classList.toggle(
                    "playing",
                    isPlaying
                );
            }
        };

    const updateProgress =
        () => {
            if (progress) {
                const percentage =
                    audio.duration > 0
                        ? (
                            audio.currentTime /
                            audio.duration
                        ) * 100
                        : 0;

                progress.value =
                    String(
                        clamp(
                            percentage,
                            0,
                            100
                        )
                    );
            }

            if (time) {
                time.textContent =
                    `${formatTime(
                        audio.currentTime
                    )} / ${formatTime(
                        audio.duration
                    )}`;
            }
        };

    const togglePlayback =
        async () => {
            try {
                if (audio.paused) {
                    await audio.play();
                } else {
                    audio.pause();
                }
            } catch (error) {
                console.warn(
                    "Audio playback was blocked:",
                    error
                );

                showToast(
                    "Press the music button again to start the song.",
                    "warning"
                );
            }
        };

    playButton?.addEventListener(
        "click",
        togglePlayback
    );

    miniButton?.addEventListener(
        "click",
        togglePlayback
    );

    progress?.addEventListener(
        "input",
        () => {
            if (
                !Number.isFinite(
                    audio.duration
                ) ||
                audio.duration <= 0
            ) {
                return;
            }

            audio.currentTime =
                (
                    Number(
                        progress.value
                    ) / 100
                ) *
                audio.duration;
        }
    );

    volume?.addEventListener(
        "input",
        () => {
            const value =
                clamp(
                    Number(
                        volume.value
                    ),
                    0,
                    1
                );

            audio.volume =
                value;

            try {
                localStorage.setItem(
                    ONAM.storage
                        .musicVolume,
                    String(value)
                );
            } catch {
                /* Storage optional. */
            }
        }
    );

    audio.addEventListener(
        "play",
        updateMusicUI
    );

    audio.addEventListener(
        "pause",
        updateMusicUI
    );

    audio.addEventListener(
        "ended",
        () => {
            updateMusicUI();

            if (progress) {
                progress.value =
                    "0";
            }
        }
    );

    audio.addEventListener(
        "timeupdate",
        updateProgress
    );

    audio.addEventListener(
        "loadedmetadata",
        updateProgress
    );

    audio.addEventListener(
        "durationchange",
        updateProgress
    );

    audio.addEventListener(
        "error",
        () => {
            showToast(
                "The Onam music file could not be loaded.",
                "error"
            );
        }
    );

    updateMusicUI();
    updateProgress();
}

/* ================================================================
   SHARE YOUR MEMORY
   ================================================================ */

function initializeMemoryForm() {
    const form =
        $("#memoryForm");

    if (!form) {
        return;
    }

    const nameInput =
        $("#memoryName");

    const textInput =
        $("#memoryText");

    const imageInput =
        $("#memoryImage");

    const preview =
        $("#memoryImagePreview");

    const count =
        $("#memoryCharacterCount");

    const nameError =
        $("#memoryNameError");

    const textError =
        $("#memoryTextError");

    const success =
        $("#memoryFormSuccess");

    const updateCharacterCount =
        () => {
            if (
                count &&
                textInput
            ) {
                count.textContent =
                    String(
                        textInput
                            .value
                            .length
                    );
            }
        };

    textInput?.addEventListener(
        "input",
        () => {
            updateCharacterCount();

            if (
                textInput.value.trim()
            ) {
                textError.textContent =
                    "";
            }
        }
    );

    nameInput?.addEventListener(
        "input",
        () => {
            if (
                nameInput.value.trim()
            ) {
                nameError.textContent =
                    "";
            }
        }
    );

    imageInput?.addEventListener(
        "change",
        async () => {
            const file =
                imageInput.files?.[0];

            if (!file) {
                clearMemoryImagePreview();
                return;
            }

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {
                imageInput.value =
                    "";

                clearMemoryImagePreview();

                showToast(
                    "Please choose an image file.",
                    "warning"
                );

                return;
            }

            try {
                const dataURL =
                    await resizeImage(
                        file,
                        ONAM.memoryImage
                            .maxWidth,
                        ONAM.memoryImage
                            .maxHeight,
                        ONAM.memoryImage
                            .quality
                    );

                if (
                    dataURL.length >
                    ONAM.memoryImage
                        .maxDataURLLength
                ) {
                    throw new Error(
                        "Image is still too large."
                    );
                }

                state.memoryImage
                    .dataURL =
                    dataURL;

                state.memoryImage
                    .fileName =
                    file.name;

                showMemoryImagePreview(
                    dataURL
                );

            } catch (error) {
                console.warn(
                    "Memory image processing failed:",
                    error
                );

                imageInput.value =
                    "";

                clearMemoryImagePreview();

                showToast(
                    "That image is too large to save in this browser.",
                    "warning"
                );
            }
        }
    );

    form.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const name =
                nameInput?.value
                    .trim() ||
                "";

            const message =
                textInput?.value
                    .trim() ||
                "";

            let valid = true;

            if (!name) {
                if (nameError) {
                    nameError.textContent =
                        "Please enter your name.";
                }

                valid = false;
            }

            if (!message) {
                if (textError) {
                    textError.textContent =
                        "Please share a little Onam memory.";
                }

                valid = false;
            }

            if (!valid) {
                showToast(
                    "Please complete the required fields.",
                    "warning"
                );

                return;
            }

            const memories =
                readStorage(
                    ONAM.storage.memories,
                    []
                );

            memories.push({
                id:
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,

                name:
                    name.slice(
                        0,
                        50
                    ),

                message:
                    message.slice(
                        0,
                        500
                    ),

                date:
                    new Date()
                        .toLocaleDateString(
                            undefined,
                            {
                                day:
                                    "numeric",
                                month:
                                    "long",
                                year:
                                    "numeric"
                            }
                        ),

                image:
                    state.memoryImage
                        .dataURL ||
                    ""
            });

            if (
                !writeStorage(
                    ONAM.storage.memories,
                    memories
                )
            ) {
                return;
            }

            form.reset();

            state.memoryImage
                .dataURL =
                "";

            state.memoryImage
                .fileName =
                "";

            clearMemoryImagePreview();

            updateCharacterCount();

            clearFormErrors();

            if (success) {
                success.textContent =
                    "🌼 Your Onam memory has been shared!";

                success.classList.add(
                    "visible"
                );

                window.setTimeout(
                    () => {
                        success.classList.remove(
                            "visible"
                        );
                    },
                    5000
                );
            }

            renderMemories();

            showToast(
                "🌿 Your Onam memory has bloomed!"
            );
        }
    );

    updateCharacterCount();

    renderMemories();
}

function clearFormErrors() {
    const nameError =
        $("#memoryNameError");

    const textError =
        $("#memoryTextError");

    if (nameError) {
        nameError.textContent =
            "";
    }

    if (textError) {
        textError.textContent =
            "";
    }
}

function clearMemoryImagePreview() {
    const preview =
        $("#memoryImagePreview");

    state.memoryImage
        .dataURL =
        "";

    state.memoryImage
        .fileName =
        "";

    if (preview) {
        preview.innerHTML =
            "";

        preview.hidden =
            true;
    }
}

function showMemoryImagePreview(
    dataURL
) {
    const preview =
        $("#memoryImagePreview");

    if (!preview) {
        return;
    }

    preview.innerHTML =
        "";

    const image =
        document.createElement(
            "img"
        );

    image.src =
        dataURL;

    image.alt =
        "Selected Onam memory preview";

    preview.appendChild(
        image
    );

    preview.hidden =
        false;
}

function resizeImage(
    file,
    maxWidth,
    maxHeight,
    quality
) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onerror =
                () =>
                    reject(
                        new Error(
                            "Could not read image."
                        )
                    );

            reader.onload =
                () => {
                    const image =
                        new Image();

                    image.onerror =
                        () =>
                            reject(
                                new Error(
                                    "Could not decode image."
                                )
                            );

                    image.onload =
                        () => {
                            const ratio =
                                Math.min(
                                    1,
                                    maxWidth /
                                        image.width,
                                    maxHeight /
                                        image.height
                                );

                            const width =
                                Math.max(
                                    1,
                                    Math.round(
                                        image.width *
                                            ratio
                                    )
                                );

                            const height =
                                Math.max(
                                    1,
                                    Math.round(
                                        image.height *
                                            ratio
                                    )
                                );

                            const canvas =
                                document.createElement(
                                    "canvas"
                                );

                            canvas.width =
                                width;

                            canvas.height =
                                height;

                            const ctx =
                                canvas.getContext(
                                    "2d"
                                );

                            if (!ctx) {
                                reject(
                                    new Error(
                                        "Canvas unavailable."
                                    )
                                );

                                return;
                            }

                            ctx.drawImage(
                                image,
                                0,
                                0,
                                width,
                                height
                            );

                            resolve(
                                canvas.toDataURL(
                                    "image/jpeg",
                                    quality
                                )
                            );
                        };

                    image.src =
                        reader.result;
                };

            reader.readAsDataURL(
                file
            );
        }
    );
}

/* ================================================================
   MEMORY CARDS
   ================================================================ */

function renderMemories() {
    const container =
        $("#memoryCardGrid");

    const counter =
        $("#memoryCount");

    if (!container) {
        return;
    }

    const memories =
        readStorage(
            ONAM.storage.memories,
            []
        );

    container.innerHTML =
        "";

    if (counter) {
        counter.textContent =
            `${memories.length} ${
                memories.length === 1
                    ? "memory"
                    : "memories"
            }`;
    }

    if (!memories.length) {
        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "empty-memory";

        const flower =
            document.createElement(
                "span"
            );

        flower.textContent =
            "🌼";

        const text =
            document.createElement(
                "p"
            );

        text.textContent =
            "Your Onam memories will bloom here.";

        empty.append(
            flower,
            text
        );

        container.appendChild(
            empty
        );

        return;
    }

    memories
        .slice()
        .reverse()
        .forEach(
            memory => {
                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "memory-card";

                if (memory.image) {
                    const image =
                        document.createElement(
                            "img"
                        );

                    image.className =
                        "memory-card-image";

                    image.src =
                        memory.image;

                    image.alt =
                        `Memory shared by ${memory.name}`;

                    card.appendChild(
                        image
                    );
                }

                const flower =
                    document.createElement(
                        "div"
                    );

                flower.className =
                    "memory-flower";

                flower.textContent =
                    "🌼";

                const content =
                    document.createElement(
                        "div"
                    );

                content.className =
                    "memory-content";

                const name =
                    document.createElement(
                        "h3"
                    );

                name.textContent =
                    memory.name ||
                    "Onam Friend";

                const message =
                    document.createElement(
                        "p"
                    );

                message.textContent =
                    memory.message ||
                    "";

                const date =
                    document.createElement(
                        "time"
                    );

                date.textContent =
                    memory.date ||
                    "";

                content.append(
                    name,
                    message,
                    date
                );

                card.append(
                    flower,
                    content
                );

                container.appendChild(
                    card
                );
            }
        );
}

/* ================================================================
   KEYBOARD ACCESSIBILITY
   ================================================================ */

function initializeKeyboardControls() {
    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                if (state.menuOpen) {
                    setNavigation(
                        false
                    );
                }

                closeGallery();
            }

            const lightbox =
                $("#imageLightbox");

            if (
                lightbox &&
                !lightbox.hidden
            ) {
                if (
                    event.key ===
                    "ArrowRight"
                ) {
                    event.preventDefault();

                    galleryNext();
                }

                if (
                    event.key ===
                    "ArrowLeft"
                ) {
                    event.preventDefault();

                    galleryPrevious();
                }
            }
        }
    );
}

/* ================================================================
   IMAGE ERROR PROTECTION
   ================================================================ */

function initializeImageProtection() {
    document.addEventListener(
        "error",
        event => {
            const image =
                event.target;

            if (
                !(
                    image instanceof
                    HTMLImageElement
                )
            ) {
                return;
            }

            if (
                image.dataset
                    .errorHandled ===
                "true"
            ) {
                return;
            }

            image.dataset
                .errorHandled =
                "true";

            image.classList.add(
                "image-load-error"
            );

            console.warn(
                "Image could not be loaded:",
                image.src
            );
        },
        true
    );
}

/* ================================================================
   VISIBILITY SAFETY
   ================================================================ */

function initializeVisibilitySafety() {
    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                return;
            }

            $$("video").forEach(
                video => {
                    if (!video.paused) {
                        video.pause();
                    }
                }
            );
        }
    );
}

/* ================================================================
   CURRENT YEAR
   ================================================================ */

function initializeCurrentYear() {
    const year =
        $("#currentYear");

    if (year) {
        year.textContent =
            String(
                new Date()
                    .getFullYear()
            );
    }
}

/* ================================================================
   FINAL STRUCTURE CHECK
   ================================================================ */

function runFinalChecks() {
    const required = [
        "#pageLoader",
        "#menuToggle",
        "#mainNavigation",
        "#home",
        "#about-onam",
        "#kerala",
        "#memories",
        "#photoGallery",
        "#pookolam",
        "#videos",
        "#music",
        "#share-memory",
        "#pookolamCanvas",
        "#onamAudio",
        "#memoryForm",
        "#imageLightbox"
    ];

    const missing =
        required.filter(
            selector =>
                !$(selector)
        );

    if (missing.length) {
        console.warn(
            "Onam page check — missing elements:",
            missing
        );
    } else {
        console.log(
            "🌼 Kerala Onam website: structure check passed."
        );
    }

    console.log(
        `🌿 Gallery items detected: ${
            state.gallery.items.length
        }`
    );

    console.log(
        "🌼 Onam interactive systems initialized."
    );
}

/* ================================================================
   GLOBAL INITIALIZATION
   ================================================================ */

function initializeOnamWebsite() {
    try {
        initializePageLoader();

        initializeNavigation();

        initializeSmoothScrolling();

        initializeScrollUI();

        initializeBackToTop();

        initializeActiveNavigation();

        initializeRevealAnimations();

        initializeRain();

        initializeGallery();

        initializeLikes();

        initializeComments();

        initializePookolam();

        initializeVideos();

        initializeMusic();

        initializeMemoryForm();

        initializeKeyboardControls();

        initializeImageProtection();

        initializeVisibilitySafety();

        initializeCurrentYear();

        updateScrollUI();

        runFinalChecks();

    } catch (error) {
        console.error(
            "A non-fatal Onam website error occurred:",
            error
        );

        showToast(
            "The celebration loaded with a small issue. Most features should still work.",
            "warning"
        );
    }
}

/* ================================================================
   START APPLICATION
   ================================================================ */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOnamWebsite,
        {
            once: true
        }
    );
} else {
    initializeOnamWebsite();
}

/* ================================================================
   END
   ================================================================ */