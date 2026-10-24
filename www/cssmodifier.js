function implementCSS(){
    const isCapacitorNative = window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    let cssFile
    if (isCapacitorNative) {
        cssFile = 'style.css';
    } else {
        cssFile = 'mobile.css';
    }
    // } else if (isMobileBrowser) {
    //     cssFile = 'mobile.css';
    // } else {
    //     cssFile = 'browser.css';
    // }
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = cssFile;
    document.head.appendChild(linkElement);
}