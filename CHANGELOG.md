# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [3.0.0-alpha.2](https://github.com/rokucommunity/roku-test-automation/compare/3.0.0-alpha.1...v3.0.0-alpha.2) - 2026-09-02
### Added
 - Add device health checks to on-device test suites ([#184](https://github.com/rokucommunity/roku-test-automation/pull/184))
### Changed
 - Security enhancements ([#183](https://github.com/rokucommunity/roku-test-automation/pull/183))
 - upgrade to [brighterscript@0.73.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0731---2026-09-02). Notable changes since 0.72.5:
     - Security enhancements ([#1782](https://github.com/rokucommunity/brighterscript/pull/1782))
     - Keep synthesized Tokens on the lexer's hidden class ([#1781](https://github.com/rokucommunity/brighterscript/pull/1781))
     - Report mismatched XML element pairs ([#1746](https://github.com/rokucommunity/brighterscript/pull/1746))
     - Add <field> and <function> completions in xml interfaces ([#1748](https://github.com/rokucommunity/brighterscript/pull/1748))
     - Cap LSP worker thread pool to fix memory scaling with project count ([#1776](https://github.com/rokucommunity/brighterscript/pull/1776))
     - Add warning for function names that exceed the truncation limit ([#1777](https://github.com/rokucommunity/brighterscript/pull/1777))
     - Security enhancements ([#1775](https://github.com/rokucommunity/brighterscript/pull/1775))
     - Bump brace-expansion in /benchmarks ([#1774](https://github.com/rokucommunity/brighterscript/pull/1774))
     - Security enhancements ([#1773](https://github.com/rokucommunity/brighterscript/pull/1773))
     - Bump qs from 6.14.2 to 6.15.3 ([#1766](https://github.com/rokucommunity/brighterscript/pull/1766))
     - Bump postcss from 8.5.10 to 8.5.25 ([#1764](https://github.com/rokucommunity/brighterscript/pull/1764))
     - Bump fast-uri from 3.1.2 to 3.1.4 ([#1763](https://github.com/rokucommunity/brighterscript/pull/1763))
     - chore: Simplify create-vsix inputs and improve branch resolution ([#1772](https://github.com/rokucommunity/brighterscript/pull/1772))
     - chore: Give fork PRs a clear create-vsix failure message ([#1770](https://github.com/rokucommunity/brighterscript/pull/1770))
     - Fix compile break against roku-deploy 3.18 ([#1752](https://github.com/rokucommunity/brighterscript/pull/1752))
     - Add SceneGraph XML element and attribute completions ([#1741](https://github.com/rokucommunity/brighterscript/pull/1741))
     - chore: Update create-vsix to support multi-vsix and shared bot logic ([#1740](https://github.com/rokucommunity/brighterscript/pull/1740))
     - Validate eval/rsg_version against firmware lifecycle ([#1698](https://github.com/rokucommunity/brighterscript/pull/1698))
     - Remove more prod deps: (drop array-flat-polyfill/readline, consolidate minimatch into micromatch) ([#1737](https://github.com/rokucommunity/brighterscript/pull/1737))
     - Replace single-use deps with util/formatUtils helpers ([#1736](https://github.com/rokucommunity/brighterscript/pull/1736))
     - chore: remove dead production dependencies ([#1735](https://github.com/rokucommunity/brighterscript/pull/1735))
     - Bump form-data from 2.5.5 to 2.5.6 ([#1733](https://github.com/rokucommunity/brighterscript/pull/1733))
### Fixed
 - Fix bslint config resolution in the language server, bump brighterscript to 0.73.0 ([#182](https://github.com/rokucommunity/roku-test-automation/pull/182))



## [3.0.0-alpha.1](https://github.com/rokucommunity/roku-test-automation/compare/3.0.0-alpha.0...v3.0.0-alpha.1) - 2026-08-28
### Added
 - Roku Cloud Emulator (RCE) device support ([#177](https://github.com/rokucommunity/roku-test-automation/pull/177))
### Changed
 - Security enhancements ([#176](https://github.com/rokucommunity/roku-test-automation/pull/176))
 - upgrade to [roku-deploy@4.0.0-alpha.5](https://github.com/rokucommunity/roku-deploy/blob/master/CHANGELOG.md#400-alpha5---2026-08-28). Notable changes since 3.17.6:
     - Roku Cloud Emulator support ([#331](https://github.com/rokucommunity/roku-deploy/pull/331))
### Fixed
 - fix: Update type checks in RTA helper functions for improved accuracy ([#171](https://github.com/rokucommunity/roku-test-automation/pull/171))



## [3.0.0-alpha.0](https://github.com/rokucommunity/roku-test-automation/compare/2.2.2...v3.0.0-alpha.0) - 2026-06-23
### Changed
 - Project restructure ([#165](https://github.com/rokucommunity/roku-test-automation/pull/165))
 - Code changes for v3.0.0 ([#160](https://github.com/rokucommunity/roku-test-automation/pull/160))
 - chore: CHANGELOG for 2.x releases ([#166](https://github.com/rokucommunity/roku-test-automation/pull/166))
 - chore: Add CI and release workflows, enable device testing and build/lint/test checks in CI ([#159](https://github.com/rokucommunity/roku-test-automation/pull/159))
 - chore: Security enhancements ([#168](https://github.com/rokucommunity/roku-test-automation/pull/168))
### Removed
 - Remove appUI base now that we can get proper key paths during initial app-ui retrieval ([#156](https://github.com/rokucommunity/roku-test-automation/pull/156))



## [2.2.2](https://github.com/rokucommunity/roku-test-automation/compare/v2.2.1...v2.2.2) - 2026-03-26
### Added
 - documentation for ECP and `OnDeviceComponent` methods ([#154](https://github.com/rokucommunity/roku-test-automation/pull/154))
### Changed
 - upgrade to [brighterscript@0.70.3](https://github.com/rokucommunity/brighterscript) (from 0.65.10) ([#155](https://github.com/rokucommunity/roku-test-automation/pull/155))
### Fixed
 - stack overflow in recursive associative array and array node fields ([#155](https://github.com/rokucommunity/roku-test-automation/pull/155))



## [2.2.1](https://github.com/rokucommunity/roku-test-automation/compare/v2.2.0...v2.2.1) - 2025-09-09
Maintenance release; no functional changes.



## [2.2.0](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.13...v2.2.0) - 2025-09-09
### Added
 - `getAppUI` support, including proper key paths during the initial app-ui retrieval, plus `getRootsCount`, `assignElementIdOnAllNodes`, and `convertKeyPathToSceneKeyPath` ([#150](https://github.com/rokucommunity/roku-test-automation/pull/150))
 - `onFieldChangeRepeat` support, allowing a field to be observed continuously until an explicit cancel function is called with the request id ([#145](https://github.com/rokucommunity/roku-test-automation/pull/145))
### Changed
 - rework response/request handling to support multiple response request types, renaming `onFieldChange` vs `onFieldChangeRepeat` ([#149](https://github.com/rokucommunity/roku-test-automation/pull/149))
 - don't send the `appUIResponse` to the device, with extra checks for large requests being printed ([#150](https://github.com/rokucommunity/roku-test-automation/pull/150))
### Fixed
 - `calculateSceneBoundingRects` to properly handle nodes with offset children content ([#150](https://github.com/rokucommunity/roku-test-automation/pull/150))
 - row title key path bug ([#150](https://github.com/rokucommunity/roku-test-automation/pull/150))
 - issue that caused the repeat observer to be removed randomly before it was supposed to ([#145](https://github.com/rokucommunity/roku-test-automation/pull/145))



## [2.0.13](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.12...v2.0.13) - 2025-04-02
Maintenance release; no functional changes.



## [2.0.12](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.11...v2.0.12) - 2025-04-01
### Fixed
 - port bug in `NetworkProxy` and added the `stoppable` dependency ([#148](https://github.com/rokucommunity/roku-test-automation/pull/148))



## [2.0.11](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.10...v2.0.11) - 2025-03-17
### Added
 - `sendLongKeypress` support, requiring press-and-hold callers to specify a press/hold duration ([#146](https://github.com/rokucommunity/roku-test-automation/pull/146))
 - support for automatically choosing a port if one isn't provided in `NetworkProxy.start()`, plus a `removeCallback` function in `processRequest`/`processResponse` args to simplify cleanup ([#146](https://github.com/rokucommunity/roku-test-automation/pull/146))
 - support for getting `query` and `requestBody` (made optional to reflect that it won't always be available) ([#146](https://github.com/rokucommunity/roku-test-automation/pull/146))
 - support for alpha builds ([#147](https://github.com/rokucommunity/roku-test-automation/pull/147))
### Changed
 - removed the `http-network-proxy` dependency in favor of using `http-proxy-middleware` directly ([#147](https://github.com/rokucommunity/roku-test-automation/pull/147))
### Fixed
 - potential crash if a set value doesn't get a valid base ([#146](https://github.com/rokucommunity/roku-test-automation/pull/146))



## [2.0.10](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.9...v2.0.10) - 2024-09-19
### Changed
 - switched to using `postman-request` for `generateScreenshot` to work around a bug in a new version of vscode ([#144](https://github.com/rokucommunity/roku-test-automation/pull/144))



## [2.0.9](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.8...v2.0.9) - 2024-09-05
### Added
 - `field` to `getValue` ([#143](https://github.com/rokucommunity/roku-test-automation/pull/143))
### Fixed
 - usage of `field` on `onFieldChangeOnce` ([#143](https://github.com/rokucommunity/roku-test-automation/pull/143))



## [2.0.8](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.7...v2.0.8) - 2024-09-05
### Added
 - ability to pass `field` to `onFieldChangeOnce`, plus contributing and getting-help info in the readme ([#142](https://github.com/rokucommunity/roku-test-automation/pull/142))
### Fixed
 - debug logging that displayed the wrong month ([#141](https://github.com/rokucommunity/roku-test-automation/pull/141))



## [2.0.7](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.6...v2.0.7) - 2024-05-08
### Added
 - `isSubtype` request type ([#139](https://github.com/rokucommunity/roku-test-automation/pull/139))



## [2.0.6](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.5...v2.0.6) - 2024-04-22
### Added
 - `createChild` and `removeNode` request types ([#138](https://github.com/rokucommunity/roku-test-automation/pull/138))
### Changed
 - quit using `success` in the response for knowing whether a request failed, in favor of explicit error handling ([#138](https://github.com/rokucommunity/roku-test-automation/pull/138))



## [2.0.5](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.4...v2.0.5) - 2024-04-08
### Changed
 - switched to using `split` instead of `tokenize` for a speed improvement ([#136](https://github.com/rokucommunity/roku-test-automation/pull/136))
### Fixed
 - prevent incomplete requests from being handled by also checking string payload size in addition to binary size ([#137](https://github.com/rokucommunity/roku-test-automation/pull/137))



## [2.0.4](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.3...v2.0.4) - 2024-03-27
### Changed
 - no longer import `path` and removed `filenamify` to avoid issues when used inside the vscode extension, added unit tests for `getTestTitlePath` ([#135](https://github.com/rokucommunity/roku-test-automation/pull/135))



## [2.0.3](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.2...v2.0.3) - 2024-03-22
### Added
 - `getRtaConfig` to allow getting the full config from components ([#132](https://github.com/rokucommunity/roku-test-automation/pull/132))
### Changed
 - improved test screenshot file naming ([#132](https://github.com/rokucommunity/roku-test-automation/pull/132))
### Fixed
 - bug introduced in Roku OS 13.0 ([#132](https://github.com/rokucommunity/roku-test-automation/pull/132))



## [2.0.2](https://github.com/rokucommunity/roku-test-automation/compare/v2.0.1...v2.0.2) - 2024-02-28
### Added
 - `createPackage` and `publish` to `RokuDevice` to avoid parallel testing issues, plus passing `deviceSelector` from `setupEnvironmentFromConfigFile` ([#129](https://github.com/rokucommunity/roku-test-automation/pull/129))
 - `LICENSE` file and switched the license to MIT to standardize with rokucommunity repos ([#128](https://github.com/rokucommunity/roku-test-automation/pull/128))
### Fixed
 - return base if `keyPath` is empty rather than falling back ([#128](https://github.com/rokucommunity/roku-test-automation/pull/128))



## [2.0.1](https://github.com/rokucommunity/roku-test-automation/compare/v0.0.1...v2.0.1) - 2024-01-05
The 2.0 release is a major rewrite of roku-test-automation. The list below highlights the most notable user-facing changes that landed across the 2.0.0 beta series ([#71](https://github.com/rokucommunity/roku-test-automation/pull/71)).
### Added
 - retry logic for ECP requests, returning a clearer error on failure ([#123](https://github.com/rokucommunity/roku-test-automation/pull/123))
 - support for `sceneSubBoundingRect` and other functions requiring params ([#119](https://github.com/rokucommunity/roku-test-automation/pull/119))
 - `isShowingOnScreen` request type ([#108](https://github.com/rokucommunity/roku-test-automation/pull/108))
 - support for extending/inheriting `rta-config.json` ([#107](https://github.com/rokucommunity/roku-test-automation/pull/107))
 - `getApplicationStartTime` request type ([#103](https://github.com/rokucommunity/roku-test-automation/pull/103))
 - Suitest integration, `getNodesWithProperties`, and the ability to add child nodes via `setValue` ([#81](https://github.com/rokucommunity/roku-test-automation/pull/81))
 - `findNodesAtLocation` request type ([#93](https://github.com/rokucommunity/roku-test-automation/pull/93))
 - `ResponsivenessTesting` functionality ([#85](https://github.com/rokucommunity/roku-test-automation/pull/85))
 - file system support (`readFile`/`writeFile`) over the new TCP socket connection ([#77](https://github.com/rokucommunity/roku-test-automation/pull/77))
 - `nodeRef` base type for accessing nodes ([#46](https://github.com/rokucommunity/roku-test-automation/pull/46))
### Changed
 - switched device communication to a TCP socket and reworked request/response handling for reliability ([#77](https://github.com/rokucommunity/roku-test-automation/pull/77))
 - moved configuration into `rta-config.json` with full validation via ajv, supporting multiple devices ([#17](https://github.com/rokucommunity/roku-test-automation/pull/17))
 - renamed `observeField` to `onFieldChangeOnce` and consolidated request/response naming ([#71](https://github.com/rokucommunity/roku-test-automation/pull/71))
 - renamed `keyPress` to `keypress` and switched `ECPKeys` to `ECP.Key` ([#106](https://github.com/rokucommunity/roku-test-automation/pull/106))
 - renamed the `server` folder to `client` ([#78](https://github.com/rokucommunity/roku-test-automation/pull/78))
 - `componentGlobalAAKeyPath` work and internal prefixing of on-device functions with `RTA_` ([#105](https://github.com/rokucommunity/roku-test-automation/pull/105))
### Fixed
 - `getFocusedNode` to not return a node when the focused node is an ArrayGrid child ([#102](https://github.com/rokucommunity/roku-test-automation/pull/102))
 - edge cases in `setValue` and `onFieldChangeOnce` ([#109](https://github.com/rokucommunity/roku-test-automation/pull/109))
 - update the device config when updating the ECP config ([#104](https://github.com/rokucommunity/roku-test-automation/pull/104))
 - path-inclusion issue when used inside the vscode extension ([#110](https://github.com/rokucommunity/roku-test-automation/pull/110))
