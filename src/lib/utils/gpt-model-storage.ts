/**
 * GPT Model Storage Utilities
 * 
 * This file provides utilities for persisting GPT model selection
 * in localStorage across chat sessions.
 */

import { type GPTModel, DEFAULT_GPT_MODEL, isValidGPTModel } from '~/types/gpt-models';

// localStorage key for GPT model preference
const GPT_MODEL_STORAGE_KEY = 'enhanced-chat-gpt-model';

/**
 * Save the selected GPT model to localStorage
 */
export function saveGPTModel(model: GPTModel): void {
  try {
    localStorage.setItem(GPT_MODEL_STORAGE_KEY, model);
  } catch (error) {
    console.warn('Failed to save GPT model to localStorage:', error);
  }
}

/**
 * Load the selected GPT model from localStorage
 * Returns the default model if no valid model is found
 */
export function loadGPTModel(): GPTModel {
  try {
    const storedModel = localStorage.getItem(GPT_MODEL_STORAGE_KEY);
    
    if (storedModel && isValidGPTModel(storedModel)) {
      return storedModel;
    }
  } catch (error) {
    console.warn('Failed to load GPT model from localStorage:', error);
  }
  
  return DEFAULT_GPT_MODEL;
}

/**
 * Clear the stored GPT model from localStorage
 */
export function clearGPTModel(): void {
  try {
    localStorage.removeItem(GPT_MODEL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear GPT model from localStorage:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}