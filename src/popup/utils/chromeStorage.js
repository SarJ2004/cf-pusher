/* eslint-disable no-undef */

export const getSyncStorage = (keys) =>
  new Promise((resolve) => chrome.storage.sync.get(keys, resolve));

export const setSyncStorage = (payload) =>
  new Promise((resolve) => chrome.storage.sync.set(payload, resolve));

export const removeSyncStorage = (keys) =>
  new Promise((resolve) => chrome.storage.sync.remove(keys, resolve));
