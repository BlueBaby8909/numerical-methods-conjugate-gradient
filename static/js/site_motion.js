(function () {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotionQuery.matches) {
        document.documentElement.classList.add("motion-reduced");
        return;
    }

    const revealTargets = [
        ".method-intro",
        ".calculator",
        ".formula-section",
        "#examples",
        "#example-2",
        ".visualization-panel",
        ".summary-card",
        ".step-card"
    ].join(",");

    function applyFallbackReveal() {
        if (!("IntersectionObserver" in window)) {
            document.querySelectorAll(revealTargets).forEach((element) => {
                element.classList.add("is-visible");
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: "0px 0px -10% 0px",
            threshold: 0.14
        });

        document.querySelectorAll(revealTargets).forEach((element) => {
            element.classList.add("reveal-on-scroll");
            observer.observe(element);
        });
    }

    function applyGsapMotion() {
        const gsap = window.gsap;

        if (!gsap) {
            applyFallbackReveal();
            return;
        }

        if (window.ScrollTrigger) {
            gsap.registerPlugin(window.ScrollTrigger);
        }

        gsap.utils.toArray(revealTargets).forEach((element, index) => {
            gsap.fromTo(element, {
                autoAlpha: 0,
                y: 26,
                scale: 0.985
            }, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.78,
                delay: Math.min(index * 0.035, 0.18),
                ease: "power3.out",
                scrollTrigger: window.ScrollTrigger ? {
                    trigger: element,
                    start: "top 86%",
                    once: true
                } : undefined
            });
        });

        gsap.utils.toArray(".method-facts div, .summary-card, .visualization-tab").forEach((element) => {
            element.addEventListener("pointermove", (event) => {
                const rect = element.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
                const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
                gsap.to(element, {
                    x,
                    y,
                    duration: 0.28,
                    ease: "power2.out"
                });
            });

            element.addEventListener("pointerleave", () => {
                gsap.to(element, {
                    x: 0,
                    y: 0,
                    duration: 0.36,
                    ease: "power2.out"
                });
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyGsapMotion, { once: true });
    } else {
        applyGsapMotion();
    }
}());
