/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type MermaidConfig } from 'mermaid';
import type { ThemeConfig } from '@docusaurus/theme-mermaid';
export declare const MermaidContainerClassName = "docusaurus-mermaid-container";
export declare function useMermaidThemeConfig(): ThemeConfig['mermaid'];
export declare function useMermaidConfig(): MermaidConfig;
export declare function useMermaidSvg(txt: string, mermaidConfigParam?: MermaidConfig): string;
