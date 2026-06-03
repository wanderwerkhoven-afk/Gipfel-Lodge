/* ENTRY POINT LOGIC - REDIRECT TO HOME */

document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // Animation Timing
    // Sequence ends around 3.1s (2.35s start + 0.75s animation)
    // Adding 0.5s hold = ~3.6s
    const animationDuration = 3600; 

    setTimeout(() => {
        // Start fade out/slide up transition
        splash.classList.add('hidden');
        
        // Optionally remove the splash screen from DOM entirely after hiding
        setTimeout(() => {
            splash.remove();
        }, 1000);
    }, animationDuration);
});
