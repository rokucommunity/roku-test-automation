# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [3.0.0-alpha.1](https://github.com/rokucommunity/roku-test-automation/compare/3.0.0-alpha.0...v3.0.0-alpha.1) - 2026-08-28
### Changed
 - Roku Cloud Emulator (RCE) device support ([#177](https://github.com/rokucommunity/roku-test-automation/pull/177))
 - Security enhancements ([#176](https://github.com/rokucommunity/roku-test-automation/pull/176))
 - Bump ip-address from 10.2.0 to 10.4.0 ([#175](https://github.com/rokucommunity/roku-test-automation/pull/175))
 - Bump body-parser from 1.20.5 to 1.20.6 ([#172](https://github.com/rokucommunity/roku-test-automation/pull/172))
 - upgrade to [roku-deploy@4.0.0-alpha.5](https://github.com/rokucommunity/roku-deploy/blob/master/CHANGELOG.md#400-alpha5---2026-08-28). Notable changes since 3.17.6:
     - Fix pkg download corruption on RCE devices ([#382](https://github.com/rokucommunity/roku-deploy/pull/382))
     - Tag RCE 502 upgrade rejections as ECONNREFUSED ([#376](https://github.com/rokucommunity/roku-deploy/pull/376))
     - Encode remote keys when building ECP URLs ([#375](https://github.com/rokucommunity/roku-deploy/pull/375))
     - Include response headers in EcpResult ([#373](https://github.com/rokucommunity/roku-deploy/pull/373))
     - Support a raw POST body on sendEcpRequest ([#368](https://github.com/rokucommunity/roku-deploy/pull/368))
     - Stop returning json from sendEcpRequest ([#367](https://github.com/rokucommunity/roku-deploy/pull/367))
     - RokuDeploy method ordering ([#358](https://github.com/rokucommunity/roku-deploy/pull/358))
     - Move constructor to the top of all classes ([83fc8f3](https://github.com/rokucommunity/roku-deploy/commit/83fc8f3))
     - Merge master into v4 ([#355](https://github.com/rokucommunity/roku-deploy/pull/355))
     - Roku Cloud Emulator support ([#331](https://github.com/rokucommunity/roku-deploy/pull/331))
     - Fix getDestPath dropping absolute src entries ([#347](https://github.com/rokucommunity/roku-deploy/pull/347))
     - Add 1s breathing room between device tests ([#348](https://github.com/rokucommunity/roku-deploy/pull/348))
     - Close code coverage gaps to hit 100% ([#343](https://github.com/rokucommunity/roku-deploy/pull/343))
     - chore: Fix brace-expansion high-severity DoS advisory ([#344](https://github.com/rokucommunity/roku-deploy/pull/344))
     - Fix mocha/ts-node breaking on Node 22+ ([#341](https://github.com/rokucommunity/roku-deploy/pull/341))
     - Full test coverage ([#325](https://github.com/rokucommunity/roku-deploy/pull/325))
     - Add cause to all thrown errors ([#329](https://github.com/rokucommunity/roku-deploy/pull/329))
     - Unified device option ([#323](https://github.com/rokucommunity/roku-deploy/pull/323))
     - Security enhancements ([#322](https://github.com/rokucommunity/roku-deploy/pull/322))
     - Merge master into v4 (2026-07-16) ([#321](https://github.com/rokucommunity/roku-deploy/pull/321))
     - Error handling rewrite ([#302](https://github.com/rokucommunity/roku-deploy/pull/302))
     - Add named options for all functions ([#314](https://github.com/rokucommunity/roku-deploy/pull/314))
     - Add validation helper functions and validate all parameters for commands ([#320](https://github.com/rokucommunity/roku-deploy/pull/320))
     - Ensure all functions return objects ([#316](https://github.com/rokucommunity/roku-deploy/pull/316))
     - Merge master into v4 ([#317](https://github.com/rokucommunity/roku-deploy/pull/317))
     - Allow setting options when creating the Roku-Deploy object ([#291](https://github.com/rokucommunity/roku-deploy/pull/291))
     - Add option to get screenshot as a buffer ([#304](https://github.com/rokucommunity/roku-deploy/pull/304))
     - Return the out path when zipping ([#296](https://github.com/rokucommunity/roku-deploy/pull/296))
     - Add a files option to the zip command ([#290](https://github.com/rokucommunity/roku-deploy/pull/290))
     - Fix sercurity audit issues ([#289](https://github.com/rokucommunity/roku-deploy/pull/289))
     - Remove getOptions ([#284](https://github.com/rokucommunity/roku-deploy/pull/284))
     - Standardize Parameter Names Between Node API and CLI ([#233](https://github.com/rokucommunity/roku-deploy/pull/233))
     - Merge master into v4 ([#283](https://github.com/rokucommunity/roku-deploy/pull/283))
     - Download actual signed package from device on newer firmware ([#244](https://github.com/rokucommunity/roku-deploy/pull/244))
     - Merge master 2 ([#231](https://github.com/rokucommunity/roku-deploy/pull/231))
     - V4 merge master ([#228](https://github.com/rokucommunity/roku-deploy/pull/228))
     - New args for commands ([#202](https://github.com/rokucommunity/roku-deploy/pull/202))
     - master into v4 - merge 3 ([#199](https://github.com/rokucommunity/roku-deploy/pull/199))
     - V4 merge 2 ([#191](https://github.com/rokucommunity/roku-deploy/pull/191))
     - V4 merge 1 ([#188](https://github.com/rokucommunity/roku-deploy/pull/188))
     - Fix some issues in the readme ([785390b](https://github.com/rokucommunity/roku-deploy/commit/785390b))
     - Add interactive remote mode ([#169](https://github.com/rokucommunity/roku-deploy/pull/169))
     - forgot apostrophe in readme ([4fa9b5c](https://github.com/rokucommunity/roku-deploy/commit/4fa9b5c))
     - Add new v4 section and table of contents ([#166](https://github.com/rokucommunity/roku-deploy/pull/166))
     - Enhanced logging levels ([#168](https://github.com/rokucommunity/roku-deploy/pull/168))
     - No changes made: ([0534143](https://github.com/rokucommunity/roku-deploy/commit/0534143))
     - merge master for github architecture latest changes ([8aa6800](https://github.com/rokucommunity/roku-deploy/commit/8aa6800))
     - Update files array ([#164](https://github.com/rokucommunity/roku-deploy/pull/164))
     - Change documentation ([#162](https://github.com/rokucommunity/roku-deploy/pull/162))
     - Merge master to v4 ([#163](https://github.com/rokucommunity/roku-deploy/pull/163))
     - Small tweaks to zip ([b738829](https://github.com/rokucommunity/roku-deploy/commit/b738829))
     - Prep build.yml for alpha releases ([1872508](https://github.com/rokucommunity/roku-deploy/commit/1872508))
     - Add cwd option ([#158](https://github.com/rokucommunity/roku-deploy/pull/158))
     - Upgrade typescript & other packages ([#157](https://github.com/rokucommunity/roku-deploy/pull/157))
     - Throw exceptions on missing options ([#156](https://github.com/rokucommunity/roku-deploy/pull/156))
     - Add cli commands and rename roku-deploy functions, reorganize functions ([#142](https://github.com/rokucommunity/roku-deploy/pull/142))
     - Eliminate top index functions ([#144](https://github.com/rokucommunity/roku-deploy/pull/144))
     - Add cli commands ([#139](https://github.com/rokucommunity/roku-deploy/pull/139))
     - Bug with {src;dest} object handling ([#135](https://github.com/rokucommunity/roku-deploy/pull/135))
     - Don't normalize file patterns ([#131](https://github.com/rokucommunity/roku-deploy/pull/131))
     - Remove retain staging folder which was deprecated ([#130](https://github.com/rokucommunity/roku-deploy/pull/130))
     - Fix tests ([d4c1583](https://github.com/rokucommunity/roku-deploy/commit/d4c1583))
     - Merge branch 'master' into v4 ([2ab649e](https://github.com/rokucommunity/roku-deploy/commit/2ab649e))
     - Adding individual interfaces ([#126](https://github.com/rokucommunity/roku-deploy/pull/126))
     - Merge branch 'master' into v4 ([fa8db4e](https://github.com/rokucommunity/roku-deploy/commit/fa8db4e))
     - Merge branch 'master' into v4 ([e3746e3](https://github.com/rokucommunity/roku-deploy/commit/e3746e3))
     - Update README.md ([b121350](https://github.com/rokucommunity/roku-deploy/commit/b121350))
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
