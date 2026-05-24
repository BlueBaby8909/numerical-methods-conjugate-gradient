(function () {
    const layoutReadyTimeout = 1300;
    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
    }

    function withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((resolve) => {
                window.setTimeout(resolve, timeoutMs);
            })
        ]);
    }

    function waitForWindowLoad() {
        if (document.readyState === "complete") {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            window.addEventListener("load", resolve, { once: true });
        });
    }

    function waitForMathJax() {
        if (!window.MathJax) {
            return Promise.resolve();
        }

        if (window.MathJax.startup && window.MathJax.startup.promise) {
            return window.MathJax.startup.promise.then(() => {
                if (window.MathJax.typesetPromise) {
                    return window.MathJax.typesetPromise();
                }

                return undefined;
            });
        }

        if (window.MathJax.typesetPromise) {
            return window.MathJax.typesetPromise();
        }

        return Promise.resolve();
    }

    function waitForAnimationFrames(count) {
        return new Promise((resolve) => {
            function step(remainingFrames) {
                if (remainingFrames <= 0) {
                    resolve();
                    return;
                }

                window.requestAnimationFrame(() => {
                    step(remainingFrames - 1);
                });
            }

            step(count);
        });
    }

    function waitForStableLayout() {
        const fontsReady = document.fonts
            ? document.fonts.ready
            : Promise.resolve();

        return Promise.all([
            withTimeout(waitForWindowLoad(), layoutReadyTimeout),
            withTimeout(fontsReady, layoutReadyTimeout),
            withTimeout(waitForMathJax(), layoutReadyTimeout)
        ]).then(() => waitForAnimationFrames(2));
    }

    function getElementFromTarget(target) {
        if (!target) {
            return null;
        }

        const normalizedTarget = target.charAt(0) === "#"
            ? target.slice(1)
            : target;

        try {
            return document.getElementById(decodeURIComponent(normalizedTarget));
        } catch (error) {
            return document.getElementById(normalizedTarget);
        }
    }

    function getTargetFromUrl(url) {
        if (url.hash) {
            return url.hash.slice(1);
        }

        return url.searchParams.get("section");
    }

    function scrollToElement(element, options) {
        if (!element) {
            return false;
        }

        const scrollMarginTop = Number.parseFloat(
            window.getComputedStyle(element).scrollMarginTop
        ) || 0;
        const top = Math.max(
            element.getBoundingClientRect().top + window.pageYOffset - scrollMarginTop,
            0
        );
        const behavior = (
            options
            && options.smooth
            && !reducedMotionQuery.matches
        ) ? "smooth" : "auto";

        window.scrollTo({
            top,
            behavior
        });

        return true;
    }

    function correctElementScroll(element) {
        if (!element) {
            return false;
        }

        const scrollMarginTop = Number.parseFloat(
            window.getComputedStyle(element).scrollMarginTop
        ) || 0;
        const targetTop = Math.max(
            element.getBoundingClientRect().top + window.pageYOffset - scrollMarginTop,
            0
        );

        if (Math.abs(window.pageYOffset - targetTop) <= 2) {
            return true;
        }

        window.scrollTo({
            top: targetTop,
            behavior: "auto"
        });

        return true;
    }

    function scrollToTarget(target, options) {
        const element = getElementFromTarget(target);

        if (!element) {
            return Promise.resolve(false);
        }

        return waitForStableLayout().then(() => {
            scrollToElement(element, options || {});
            return true;
        });
    }

    function handleAnchorClick(event) {
        const link = event.target.closest("a[href]");

        if (!link) {
            return;
        }

        const url = new URL(link.href, window.location.href);
        const target = getTargetFromUrl(url);
        const isCurrentPage = (
            url.origin === window.location.origin
            && url.pathname === window.location.pathname
        );

        if (!target || !isCurrentPage) {
            return;
        }

        event.preventDefault();
        window.history.pushState(null, "", url.pathname + url.search + url.hash);
        scrollToTarget(target, { smooth: true });
    }

    function scrollToRequestedSection() {
        if (document.querySelector("[data-scroll-after-submit='true']")) {
            return;
        }

        const url = new URL(window.location.href);
        const target = getTargetFromUrl(url);

        if (target) {
            scrollToTarget(target, { smooth: true });
        }
    }

    document.addEventListener("click", handleAnchorClick);

    window.NumericalMethodsUI = {
        correctElementScroll,
        scrollToElement,
        scrollToTarget,
        waitForStableLayout
    };

    scrollToRequestedSection();
}());
