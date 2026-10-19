"use strict";

(() => {
  const root = document.documentElement;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  const mobileViewport = window.matchMedia(
    "(max-width: 960px)"
  );

  root.classList.add("js");

  let userPausedMotion = false;

  const motionAllowed = () =>
    !reducedMotion.matches && !userPausedMotion;

  /* CURRENT YEAR */

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  /* MOBILE NAVIGATION */

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");

  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !navigation) return;

    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");

    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");

    if (restoreFocus) menuButton.focus();
  };

  if (menuButton && navigation) {
    menuButton.hidden = false;

    menuButton.addEventListener("click", () => {
      const isOpen =
        menuButton.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        closeMenu();
        return;
      }

      navigation.classList.add("is-open");
      document.body.classList.add("menu-open");

      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Close navigation");
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("click", (event) => {
      if (!navigation.classList.contains("is-open")) return;
      if (!(event.target instanceof Node)) return;

      if (
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!navigation.classList.contains("is-open")) return;

      if (event.key === "Escape") {
        closeMenu(true);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = [
        menuButton,
        ...navigation.querySelectorAll(
          'a[href], button:not([disabled])'
        )
      ].filter((element) => element.getClientRects().length > 0);

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    });

    mobileViewport.addEventListener("change", () => {
      closeMenu();
    });
  }

  /* HEADER AND BACK TO TOP */

  const header = document.querySelector(".site-header");
  const backToTop = document.querySelector(".back-to-top");

  let scrollFrame = 0;

  const updateScrollState = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 15);

    if (backToTop) {
      backToTop.hidden = window.scrollY < 650;
    }

    scrollFrame = 0;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(updateScrollState);
    },
    { passive: true }
  );

  updateScrollState();

  /* SCROLL REVEALS */

  const revealElements = [
    ...document.querySelectorAll("[data-reveal]")
  ];

  let revealObserver = null;

  const revealAll = () => {
    revealObserver?.disconnect();

    revealElements.forEach((element) => {
      element.classList.remove("reveal-ready");
      element.classList.add("is-visible");
    });
  };

  if (motionAllowed() && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          entry.target.classList.remove("reveal-ready");

          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.06,
        rootMargin: "0px 0px -18px 0px"
      }
    );

    revealElements.forEach((element) => {
      if (element.closest("[hidden]")) return;

      const bounds = element.getBoundingClientRect();

      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        element.classList.add("is-visible");
      } else {
        element.classList.add("reveal-ready");
        revealObserver.observe(element);
      }
    });
  } else {
    revealAll();
  }

  /* INTERACTIVE TRANSFORM CLEANUP */

  const resetCallbacks = [];

  const canUsePointerMotion = (event) =>
    motionAllowed() &&
    finePointer.matches &&
    event.pointerType === "mouse";

  /* HERO 3D PERSPECTIVE */

  document.querySelectorAll("[data-scene]").forEach((scene) => {
    const interactionArea = scene.closest(".hero__visual") || scene;

    let frame = 0;
    let sceneX = 0;
    let sceneY = 0;

    const resetScene = () => {
      cancelAnimationFrame(frame);
      frame = 0;

      scene.style.setProperty("--scene-x", "0deg");
      scene.style.setProperty("--scene-y", "0deg");
    };

    resetCallbacks.push(resetScene);

    interactionArea.addEventListener(
      "pointermove",
      (event) => {
        if (!canUsePointerMotion(event)) return;

        const bounds = interactionArea.getBoundingClientRect();

        if (!bounds.width || !bounds.height) return;

        const x = Math.max(
          -0.5,
          Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5)
        );

        const y = Math.max(
          -0.5,
          Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5)
        );

        sceneX = -y * 9;
        sceneY = x * 11;

        if (frame) return;

        frame = requestAnimationFrame(() => {
          scene.style.setProperty("--scene-x", `${sceneX}deg`);
          scene.style.setProperty("--scene-y", `${sceneY}deg`);

          frame = 0;
        });
      },
      { passive: true }
    );

    interactionArea.addEventListener("pointerleave", resetScene);
    interactionArea.addEventListener("pointercancel", resetScene);
  });

  /* SUBTLE SERVICE CARD TILT */

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    let frame = 0;
    let rotateX = 0;
    let rotateY = 0;

    const resetCard = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.transform = "";
    };

    resetCallbacks.push(resetCard);

    card.addEventListener(
      "pointermove",
      (event) => {
        if (!canUsePointerMotion(event)) return;

        // Keep keyboard-focused links steady.
        if (card.contains(document.activeElement)) return;

        const bounds = card.getBoundingClientRect();

        if (!bounds.width || !bounds.height) return;

        const x = Math.max(
          -0.5,
          Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5)
        );

        const y = Math.max(
          -0.5,
          Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5)
        );

        rotateX = -y * 4;
        rotateY = x * 4;

        if (frame) return;

        frame = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(1200px) ` +
            `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

          frame = 0;
        });
      },
      { passive: true }
    );

    card.addEventListener("pointerleave", resetCard);
    card.addEventListener("pointercancel", resetCard);
    card.addEventListener("focusin", resetCard);
  });

  /* MAGNETIC BUTTON ACCENT */

  document.querySelectorAll("[data-magnetic]").forEach((button) => {
    let frame = 0;
    let offsetX = 0;
    let offsetY = 0;

    const resetButton = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      button.style.transform = "";
    };

    resetCallbacks.push(resetButton);

    button.addEventListener(
      "pointermove",
      (event) => {
        if (!canUsePointerMotion(event)) return;
        if (button.contains(document.activeElement)) return;

        const bounds = button.getBoundingClientRect();

        offsetX = Math.max(
          -6,
          Math.min(6, (event.clientX - bounds.left - bounds.width / 2) * 0.07)
        );

        offsetY = Math.max(
          -4,
          Math.min(4, (event.clientY - bounds.top - bounds.height / 2) * 0.1)
        );

        if (frame) return;

        frame = requestAnimationFrame(() => {
          button.style.transform =
            `translate3d(${offsetX}px, ${offsetY}px, 0)`;

          frame = 0;
        });
      },
      { passive: true }
    );

    button.addEventListener("pointerleave", resetButton);
    button.addEventListener("pointercancel", resetButton);
    button.addEventListener("focusin", resetButton);
  });

  const resetPointerTransforms = () => {
    resetCallbacks.forEach((reset) => reset());
  };

  /* ORBIT CURSOR */

  const cursor = document.querySelector(".cursor-orbit");

  let cursorFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const hideCursor = () => {
    cancelAnimationFrame(cursorFrame);
    cursorFrame = 0;

    cursor?.classList.remove(
      "is-visible",
      "is-link",
      "is-explore",
      "is-pressed"
    );
  };

  const updateCursorAvailability = () => {
    if (!cursor) return;

    cursor.hidden = !finePointer.matches || !motionAllowed();

    if (cursor.hidden) hideCursor();
  };

  if (cursor) {
    updateCursorAvailability();

    document.addEventListener(
      "pointermove",
      (event) => {
        if (cursor.hidden || event.pointerType !== "mouse") return;

        const target =
          event.target instanceof Element ? event.target : null;

        if (
          !target ||
          target.closest(
            "input, textarea, select, [contenteditable='true']"
          ) ||
          document.body.classList.contains("intro-running")
        ) {
          hideCursor();
          return;
        }

        pointerX = event.clientX;
        pointerY = event.clientY;

        cursor.classList.toggle(
          "is-link",
          Boolean(target.closest("a, button, summary, label"))
        );

        cursor.classList.toggle(
          "is-explore",
          Boolean(target.closest(".service-card__image-link"))
        );

        if (cursorFrame) return;

        cursorFrame = requestAnimationFrame(() => {
          cursor.style.transform =
            `translate3d(${pointerX - 23}px, ${pointerY - 23}px, 0)`;

          cursor.classList.add("is-visible");
          cursorFrame = 0;
        });
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (cursor.hidden || event.pointerType !== "mouse") return;
        cursor.classList.add("is-pressed");
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerup",
      () => cursor.classList.remove("is-pressed"),
      { passive: true }
    );

    document.addEventListener("pointercancel", hideCursor);
    document.documentElement.addEventListener("pointerleave", hideCursor);

    // Hide the decorative pointer while navigating with a keyboard.
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") hideCursor();
    });
  }

  /* MOTION PREFERENCE */

  const motionButton = document.querySelector(".motion-toggle");
  const motionButtonText = motionButton?.querySelector(
    ".motion-toggle__text"
  );

  const syncMotion = () => {
    const paused = !motionAllowed();

    root.classList.toggle("motion-paused", paused);

    if (motionButton) {
      motionButton.hidden = reducedMotion.matches;
      motionButton.setAttribute("aria-pressed", String(paused));

      if (motionButtonText) {
        motionButtonText.textContent =
          paused ? "Resume motion" : "Pause motion";
      }
    }

    if (paused) {
      resetPointerTransforms();
      revealAll();
    }

    updateCursorAvailability();
  };

  motionButton?.addEventListener("click", () => {
    userPausedMotion = !userPausedMotion;
    syncMotion();
  });

  finePointer.addEventListener("change", () => {
    resetPointerTransforms();
    updateCursorAvailability();
  });

  window.addEventListener("blur", () => {
    hideCursor();
    resetPointerTransforms();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hideCursor();
      resetPointerTransforms();
    }
  });

  /* CINEMATIC LOGO OPENING */

  const opening = document.querySelector("#opening-screen");

  let openingDelay = 0;
  let openingFallback = 0;
  let exitFallback = 0;

  let openingFinished = false;
  let openingExiting = false;

  const cleanOpeningListeners = () => {
    document.removeEventListener("keydown", skipOpening);
    document.removeEventListener("pointerdown", skipOpening);
  };

  const finishOpening = () => {
    if (!opening || openingFinished) return;

    openingFinished = true;

    window.clearTimeout(openingDelay);
    window.clearTimeout(openingFallback);
    window.clearTimeout(exitFallback);

    opening.hidden = true;
    opening.classList.remove("is-exiting");

    document.body.classList.remove("intro-running");

    cleanOpeningListeners();
  };

  const exitOpening = () => {
    if (!opening || openingFinished || openingExiting) return;

    if (reducedMotion.matches || document.hidden) {
      finishOpening();
      return;
    }

    openingExiting = true;
    opening.classList.add("is-exiting");

    // Always release the page if animationend is interrupted.
    exitFallback = window.setTimeout(finishOpening, 1000);
  };

  function skipOpening() {
    finishOpening();
  }

  if (opening && !reducedMotion.matches) {
    const isHome =
      document.querySelector(".hero") !== null;

    // Run the full introduction on the home page.
    if (isHome) {
      opening.hidden = false;
      document.body.classList.add("intro-running");

      opening.addEventListener("animationend", (event) => {
        if (
          event.target === opening &&
          event.animationName === "openingScreenExit"
        ) {
          finishOpening();
        }
      });

      document.addEventListener("keydown", skipOpening);
      document.addEventListener("pointerdown", skipOpening);

      openingDelay = window.setTimeout(exitOpening, 2100);
      openingFallback = window.setTimeout(finishOpening, 3400);

      const openingLogo = opening.querySelector("img");

      if (openingLogo) {
        openingLogo.addEventListener("error", finishOpening, {
          once: true
        });

        if (openingLogo.complete && openingLogo.naturalWidth === 0) {
          finishOpening();
        }
      }
    } else {
      finishOpening();
    }
  } else if (opening) {
    finishOpening();
  }

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      finishOpening();
    }

    syncMotion();
  });

  // Do not replay a locked introduction when returning via browser history.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      finishOpening();
      closeMenu();
      updateScrollState();
      resetPointerTransforms();
    }
  });

  syncMotion();
})();
/* CANADIAN MEDICAL GROUP — APPOINTMENT FORM */

(() => {
  const form = document.querySelector("#cmg-appointment-form");

  if (!form) return;

  const status = form.querySelector("#cmg-form-status");
  const nameField = form.querySelector("#cmg-name");
  const phoneField = form.querySelector("#cmg-phone");
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = submitButton?.querySelector("span");

  let sending = false;

  const showStatus = (message) => {
    if (status) status.textContent = message;
  };

  form.addEventListener("input", (event) => {
    const field = event.target;

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.setCustomValidity("");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (sending) return;

    showStatus("");

    nameField?.setCustomValidity("");

    if (nameField && !nameField.value.trim()) {
      nameField.setCustomValidity("Please enter your full name.");
    }

    phoneField?.setCustomValidity("");

    const phone = phoneField?.value.trim() || "";

    if (phone) {
      const digits = phone.replace(/\D/g, "");

      if (digits.length < 7 || digits.length > 15) {
        phoneField.setCustomValidity(
          "Please enter a phone number with 7 to 15 digits."
        );
      }
    }

    if (!form.reportValidity()) return;

    sending = true;

    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = "Sending request…";

    form.setAttribute("aria-busy", "true");

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      const data = new FormData(form);

      const response = await fetch(
        "https://formspree.io/f/xdeavzbb",
        {
          method: "POST",
          headers: {
            Accept: "application/json"
          },
          body: data,
          signal: controller.signal
        }
      );

      const result = await response.json();

      if (!response.ok || result.ok !== true) {
        throw new Error("Submission was not confirmed.");
      }

      form.reset();

      showStatus(
        "Your appointment request has been received. " +
        "Our clinic will contact you to confirm availability."
      );
    } catch (error) {
      if (error.name === "AbortError") {
        showStatus(
          "We couldn’t confirm whether your request was received. " +
          "Please contact the clinic before sending it again: " +
          "+1 (416) 666-3486 or canadianmedicalgroupinc@gmail.com."
        );
      } else {
        showStatus(
          "We couldn’t confirm delivery. Please contact us at " +
          "+1 (416) 666-3486 or canadianmedicalgroupinc@gmail.com."
        );
      }
    } finally {
      window.clearTimeout(timeout);

      sending = false;

      form.removeAttribute("aria-busy");

      if (submitButton) submitButton.disabled = false;

      if (submitLabel) {
        submitLabel.textContent = "Send appointment request";
      }
    }
  });
})();
/* CANADIAN MEDICAL GROUP — PHONE CONTACT */
(() => {
  const phoneLink = "tel:+14166663486";
  const phoneText = "+1 (416) 666-3486";

  // Footer: this section exists on all three pages.
  const footerContact = document.querySelector(".footer-contact");

  if (footerContact && !footerContact.querySelector("[data-cmg-phone]")) {
    const link = document.createElement("a");

    link.href = phoneLink;
    link.textContent = phoneText;
    link.dataset.cmgPhone = "true";
    link.setAttribute("aria-label", `Call Canadian Medical Group at ${phoneText}`);

    const emailLink = footerContact.querySelector('a[href^="mailto:"]');

    if (emailLink) {
      footerContact.insertBefore(link, emailLink);
    } else {
      footerContact.append(link);
    }
  }

  // About & Contact page.
  const contactInfo = document.querySelector(".ct-contact-info");

  if (contactInfo && !contactInfo.querySelector("[data-cmg-call-button]")) {
    const link = document.createElement("a");

    link.href = phoneLink;
    link.className = "button button--primary cmg-call-button";
    link.textContent = `Call ${phoneText}`;
    link.dataset.cmgCallButton = "true";

    const intro = contactInfo.querySelector(".ct-contact-info__intro");

    if (intro) {
      intro.insertAdjacentElement("afterend", link);
    } else {
      contactInfo.append(link);
    }
  }
})();