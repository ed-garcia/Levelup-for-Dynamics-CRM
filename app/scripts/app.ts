/// <reference path="inject/levelup.common.utility.ts" />

import { Utility } from './inject/levelup.common.utility';
import { ICustomMessage, IExtensionMessage, AreaType, LocalStorage, IExtensionLocalStorage } from './interfaces/types';

class App {
  isCRMPage: boolean;

  constructor() {
    this.isCRMPage = Array.from(document.scripts).some(
      (x) =>
        x.src.indexOf('/uclient/scripts') !== -1 ||
        x.src.indexOf('/_static/_common/scripts/PageLoader.js') !== -1 ||
        x.src.indexOf('/_static/_common/scripts/crminternalutility.js') !== -1
    );
  }

  start() {
    this.initializeStorage();

    this.hookupEventListeners();
    if (this.isCRMPage) {
      Utility.injectScript(chrome.extension.getURL('scripts/Sdk.Soap.min.js'));
      Utility.injectScript(chrome.extension.getURL('scripts/levelup.extension.js'));
      Utility.enableExtension(true);
    } else {
      Utility.enableExtension(false);
    }
  }

  private initializeStorage() {
    chrome.storage.local.get([LocalStorage.lastUrl], function (result: IExtensionLocalStorage) {
      let lastUrl = result.lastUrl;
      let currentUrl = document.location.origin;

      if (lastUrl != currentUrl) {
        chrome.storage.local.clear();
        chrome.storage.local.set({ [LocalStorage.lastUrl]: currentUrl });
      }
    });
  }

  private hookupEventListeners() {
    document.addEventListener('levelup', (data: ICustomMessage) => {
      if (data.detail && data.detail.type === 'Page') {
        chrome.runtime.sendMessage(data.detail);
      }
    });

    chrome.runtime.onMessage.addListener((message: IExtensionMessage, sender, response) => {
      if (message.type === 'VisibilityCheck') {
        let contentPanels = Array.from(document.querySelectorAll('iframe')).filter((d) => {
          return d.style.visibility !== 'hidden' && d.style.display !== 'none';
        });

        if (contentPanels && contentPanels.length > 0) {
          let formDocument = contentPanels[0].contentWindow.document;
          if (
            formDocument.querySelector('#crmFormHeaderTop') ||
            document.querySelector('div[data-id="editFormRoot"]') ||
            document.querySelector('#editFormRoot')
          ) {
            response(AreaType.Form);
          } else if (
            formDocument.querySelector('span.ms-crm-View-Name') ||
            document.querySelector(`[id^='ViewSelector']`)
          ) {
            response(AreaType.Grid);
          }
        } else {
          response(AreaType.General);
        }
      }
    });
  }
}

new App().start();

