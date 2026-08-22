# Alpine design system

The UI combines a dark forest navigation rail, warm cream canvas, paper cards, amber focus accents and compact data presentation. Fraunces is used for editorial page titles; Manrope is used for controls and operational copy. Topographic linework is decorative and low contrast.

Core tokens live in `apps/admin/src/styles.css`. Components have visible hover, focus, loading, success, warning and error states. Minimum tap targets are 44px on mobile. Motion is brief and disabled by `prefers-reduced-motion`. Tables collapse into labelled cards below 760px. Dialogs trap conceptual focus, close on Escape and return focus through React lifecycle.
