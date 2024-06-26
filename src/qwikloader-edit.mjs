export default (() => {
  ((doc, hasInitialized) => {
    const Q_CONTEXT = "__q_context__";
    const win = window;
    const events = new Set();
    const querySelectorAll = (query) => doc.querySelectorAll(query);
    const isPromise = (promise) =>
      promise && typeof promise.then === "function";
    const broadcast = (infix, ev, type = ev.type) => {
      querySelectorAll("[on" + infix + "\\:" + type + "]").forEach((el) =>
        dispatch(el, infix, ev, type)
      );
    };
    const resolveContainer = (containerEl) => {
      if (void 0 === containerEl._qwikjson_) {
        let script = (
          containerEl === doc.documentElement ? doc.body : containerEl
        ).lastElementChild;
        while (script) {
          if (
            "SCRIPT" === script.tagName &&
            "qwik/json" === script.getAttribute("type")
          ) {
            containerEl._qwikjson_ = JSON.parse(
              script.textContent.replace(/\\x3C(\/?script)/gi, "<$1")
            );
            break;
          }
          script = script.previousElementSibling;
        }
      }
    };
    const createEvent = (eventName, detail) =>
      new CustomEvent(eventName, {
        detail: detail,
      });
    const dispatch = async (element, onPrefix, ev, eventName = ev.type) => {
      const attrName = "on" + onPrefix + ":" + eventName;
      element.hasAttribute("preventdefault:" + eventName) &&
        ev.preventDefault();
      // if (element.hasAttribute("stoppropagation:" + eventName)) {
      //   ev.stopPropagation();
      // }
      const ctx = element._qc_;
      const relevantListeners =
        ctx && ctx.li.filter((li) => li[0] === attrName);
      if (relevantListeners && relevantListeners.length > 0) {
        for (const listener of relevantListeners) {
          const fn = listener[1].getFn(
            [element, ev],
            () => element.isConnected
          );
          const result = fn(ev, element);
          let cancelBubble = ev.cancelBubble;
          // cancelBubble = cancelBubble || ev.cancelBubble;
          if (result instanceof Promise) {
            // console.log("async listener", result);
            await result;
            // cancelBubble = cancelBubble || ev.cancelBubble;
          } else {
            // console.log("sync listener", result);
          }
          if (cancelBubble) {
            ev.stopPropagation();
          }
        }
        return;
      }
      const attrValue = element.getAttribute(attrName);
      if (attrValue) {
        const container = element.closest("[q\\:container]");
        const base = new URL(container.getAttribute("q:base"), doc.baseURI);
        for (const qrl of attrValue.split("\n")) {
          const url = new URL(qrl, base);
          const symbolName =
            url.hash.replace(/^#?([^?[|]*).*$/, "$1") || "default";
          const reqTime = performance.now();
          let handler;
          const isSync = qrl.startsWith("#");
          if (isSync) {
            handler = (container.qFuncs || [])[Number.parseInt(symbolName)];
            // console.log("sync handler", symbolName);
          } else {
            const module = import(
              /* @vite-ignore */
              url.href.split("#")[0]
            );
            resolveContainer(container);
            if (isPromise(module)) {
              // debugger;
              handler = (await module)[symbolName];
            } else {
              // debugger;
            }
          }
          const previousCtx = doc[Q_CONTEXT];
          if (element.isConnected) {
            try {
              doc[Q_CONTEXT] = [element, ev, url];
              isSync ||
                emitEvent("qsymbol", {
                  symbol: symbolName,
                  element: element,
                  reqTime: reqTime,
                });
              const result = handler(ev, element);
              if (isPromise(result)) {
                await result;
              }
            } finally {
              doc[Q_CONTEXT] = previousCtx;
            }
          }
        }
      }
    };
    const emitEvent = (eventName, detail) => {
      doc.dispatchEvent(createEvent(eventName, detail));
    };
    const camelToKebab = (str) =>
      str.replace(/([A-Z])/g, (a) => "-" + a.toLowerCase());
    const processDocumentEvent = async (ev) => {
      let type = camelToKebab(ev.type);
      let element = ev.target;
      broadcast("-document", ev, type);
      while (element && element.getAttribute) {
        const results = dispatch(element, "", ev, type);
        let cancelBubble = ev.cancelBubble;
        // cancelBubble = cancelBubble || ev.cancelBubble;
        if (results instanceof Promise) {
          // console.log("async dispatch", results);
          await results;
          // cancelBubble = cancelBubble || ev.cancelBubble;
        } else {
          // console.log("sync dispatch", results);
        }
        cancelBubble =
          cancelBubble ||
          ev.cancelBubble ||
          element.hasAttribute("stoppropagation:" + ev.type);
        // if (
        //   cancelBubble ||
        //   ev.cancelBubble ||
        //   element.hasAttribute("stoppropagation:" + ev.type)
        // ) {
        //   cancelBubble = true;
        // }

        element =
          ev.bubbles && !0 !== cancelBubble ? element.parentElement : null;
        //
      }
    };
    const processWindowEvent = (ev) => {
      broadcast("-window", ev, camelToKebab(ev.type));
    };
    const processReadyStateChange = () => {
      var _a;
      const readyState = doc.readyState;
      if (
        !hasInitialized &&
        ("interactive" == readyState || "complete" == readyState)
      ) {
        hasInitialized = 1;
        emitEvent("qinit");
        (null != (_a = win.requestIdleCallback) ? _a : win.setTimeout).bind(
          win
        )(() => emitEvent("qidle"));
        if (events.has("qvisible")) {
          const results = querySelectorAll("[on\\:qvisible]");
          const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                dispatch(entry.target, "", createEvent("qvisible", entry));
              }
            }
          });
          results.forEach((el) => observer.observe(el));
        }
      }
    };
    const addEventListener = (el, eventName, handler, capture = !1) =>
      el.addEventListener(eventName, handler, {
        capture: capture,
        passive: !1,
      });
    const push = (eventNames) => {
      for (const eventName of eventNames) {
        if (!events.has(eventName)) {
          addEventListener(doc, eventName, processDocumentEvent, !0);
          addEventListener(win, eventName, processWindowEvent, !0);
          events.add(eventName);
        }
      }
    };
    if (!(Q_CONTEXT in doc)) {
      doc[Q_CONTEXT] = 0;
      const qwikevents = win.qwikevents;
      Array.isArray(qwikevents) && push(qwikevents);
      win.qwikevents = {
        push: (...e) => push(e),
      };
      addEventListener(doc, "readystatechange", processReadyStateChange);
      processReadyStateChange();
    }
  })(document);
})();
