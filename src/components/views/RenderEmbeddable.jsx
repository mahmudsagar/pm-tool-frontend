
const useDefaultExcalidrawFrame = (element) => {
  return !(element.link.startsWith("[") || element.link.startsWith("file:") || element.link.startsWith("data:")); // && !element.link.match(TWITTER_REG);
}

const REG_LINKINDEX_HYPERLINK = /^\w+:\/\//;

const REGEX_LINK = {
  getResList: (text) => {
    const res = text.matchAll(REGEX_LINK.EXPR);
    let parts;
    const resultList = [];
    while (!(parts = res.next()).done) {
      resultList.push(parts);
    }
    return resultList;
  },
  getRes: (text) => {
    return text.matchAll(REGEX_LINK.EXPR);
  },
  isTransclusion: (parts) => {
    return !!parts.value[1];
  },
  getLink: (parts) => {
    return parts.value[3] ? parts.value[3] : parts.value[6];
  },
  isWikiLink: (parts) => {
    return !!parts.value[3];
  },
  getAliasOrLink: (parts) => {
    return REGEX_LINK.isWikiLink(parts)
      ? parts.value[4]
        ? parts.value[4]
        : parts.value[3]
      : parts.value[5]
        ? parts.value[5]
        : parts.value[6];
  },
  getWrapLength: (
    parts,
    defaultWrap,
  ) => {
    const len = parseInt(parts.value[8]);
    if (isNaN(len)) {
      return defaultWrap > 0 ? defaultWrap : null;
    }
    return len;
  },
};


function renderWebView(src, view, id, _) {
  const isDataURL = src.startsWith("data:");
  // if (DEVICE.isDesktop && !isDataURL) {
  if (!isDataURL) {
    return (
      <webview
        ref={(ref) => view.updateEmbeddableRef(id, ref)}
        className="excalidraw__embeddable"
        title="Excalidraw Embedded Content"
        // allowFullScreen={true}
        src={src}
        style={{
          overflow: "hidden",
          borderRadius: "var(--embeddable-radius)",
        }}
      />
    );
  }
  return (
    <iframe
      ref={(ref) => view.updateEmbeddableRef(id, ref)}
      className="excalidraw__embeddable"
      title="Excalidraw Embedded Content"
      allowFullScreen={true}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      src={isDataURL ? null : src}
      style={{
        overflow: "hidden",
        borderRadius: "var(--embeddable-radius)",
      }}
      srcDoc={isDataURL ? atob(src.split(',')[1]) : null}
    />
  );
}



export const CustomEmbeddable = ({ element, view, appState, linkText }) => {
  const React = view.packages.react;
  const containerRef = React.useRef(null);
  // const theme = getTheme(view, appState.theme);
  const mdProps = element.customData?.mdProps || null;
  return (
    <div
      ref={containerRef}
      style={{
        width: `100%`,
        height: `100%`,
        borderRadius: "var(--embeddable-radius)",
        color: `var(--text-normal)`,
      }}
      // className={`${theme} canvas-node ${mdProps?.filenameVisible && !mdProps.useObsidianDefaults ? "" : "excalidraw-mdEmbed-hideFilename"}`}
      className={` canvas-node ${mdProps?.filenameVisible && !mdProps.useObsidianDefaults ? "" : "excalidraw-mdEmbed-hideFilename"}`}
    >
      {/* <RenderObsidianView
        mdProps={mdProps}
        element={element}
        linkText={linkText}
        view={view}
        containerRef={containerRef}
        activeEmbeddable={appState.activeEmbeddable}
        theme={appState.theme}
        canvasColor={appState.viewBackgroundColor}
      /> */}
    </div>
  )
}

const RenderEmbeddable = ({ element, appState }) => {
  const useExcalidrawFrame = useDefaultExcalidrawFrame(element);

  if (!element || !element.link || element.link.length === 0 || useExcalidrawFrame) {
    return null;
  }

  if (element.link.match(REG_LINKINDEX_HYPERLINK) || element.link.startsWith("data:")) {
    if (!useExcalidrawFrame) {
      return renderWebView(element.link, element.id, appState);
    } else {
      return null;
    }
  }

  const res = REGEX_LINK.getRes(element.link).next();
  if (!res || (!res.value && res.done)) {
    return null;
  }

  let linkText = REGEX_LINK.getLink(res);

  if (linkText.match(REG_LINKINDEX_HYPERLINK)) {
    if (!useExcalidrawFrame) {
      return renderWebView(linkText, element.id, appState);
    } else {
      return null;
    }
  }

  return (
    <CustomEmbeddable element={element} appState={appState} linkText={linkText} />
  );
};

export default RenderEmbeddable;
