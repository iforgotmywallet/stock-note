/**
 * GPT Model Types and Configuration
 * 
 * This file defines the available GPT models and their configurations
 * for the enhanced chat interface.
 */

// GPT Model type definition - only the three specified models
export type GPTModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';

// GPT Model configuration interface
export interface GPTModelConfig {
  id: GPTModel;
  name: string;
  description: string;
  maxTokens: number;
  costPerToken: number;
}

// GPT Model configurations
export const GPT_MODELS: GPTModelConfig[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for most tasks',
    maxTokens: 4096,
    costPerToken: 0.0015
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Most capable model for complex reasoning',
    maxTokens: 8192,
    costPerToken: 0.03
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Latest model with improved performance',
    maxTokens: 128000,
    costPerToken: 0.01
  }
];

// Default GPT model
export const DEFAULT_GPT_MODEL: GPTModel = 'gpt-4-turbo';

// Helper function to get model configuration by ID
export function getGPTModelConfig(modelId: GPTModel): GPTModelConfig {
  const config = GPT_MODELS.find(model => model.id === modelId);
  if (!config) {
    throw new Error(`Unknown GPT model: ${modelId}`);
  }
  return config;
}

// Helper function to validate if a string is a valid GPT model
export function isValidGPTModel(model: string): model is GPTModel {
  return GPT_MODELS.some(config => config.id === model);
}