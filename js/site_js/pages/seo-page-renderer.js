/**
 * SEO Page Renderer - Gipfel Lodge
 * Renders Firebase SEO content to the #seo-landing-page container safely.
 */

class SEOPageRenderer {
    constructor() {
        this.containerId = 'seo-page-content';
    }

    render(pageData) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear existing content safely
        container.textContent = '';

        // Safely build DOM
        const frag = document.createDocumentFragment();

        // 1. H1 Title
        if (pageData.h1) {
            const h1 = document.createElement('h1');
            h1.textContent = pageData.h1;
            frag.appendChild(h1);
        }

        // 2. Intro Text
        if (pageData.intro) {
            const intro = document.createElement('p');
            intro.className = 'seo-hero-intro';
            intro.textContent = pageData.intro;
            frag.appendChild(intro);
        }

        // 3. Content Blocks
        if (Array.isArray(pageData.contentBlocks)) {
            pageData.contentBlocks.forEach(block => {
                const blockEl = this.renderBlock(block);
                if (blockEl) frag.appendChild(blockEl);
            });
        }

        // 4. FAQ
        if (Array.isArray(pageData.faq) && pageData.faq.length > 0) {
            const faqEl = this.renderFAQ(pageData.faq);
            if (faqEl) frag.appendChild(faqEl);
        }

        container.appendChild(frag);
    }

    renderBlock(block) {
        if (!block || !block.type) return null;

        const wrapper = document.createElement('div');
        
        switch (block.type) {
            case 'text':
                wrapper.className = 'seo-block-text';
                if (block.heading) {
                    const h2 = document.createElement('h2');
                    h2.textContent = block.heading;
                    wrapper.appendChild(h2);
                }
                if (block.body) {
                    const p = document.createElement('p');
                    p.textContent = block.body;
                    wrapper.appendChild(p);
                }
                break;

            case 'imageText':
                wrapper.className = 'seo-block-image-text';
                
                const textCol = document.createElement('div');
                if (block.heading) {
                    const h2 = document.createElement('h2');
                    h2.textContent = block.heading;
                    textCol.appendChild(h2);
                }
                if (block.body) {
                    const p = document.createElement('p');
                    p.textContent = block.body;
                    textCol.appendChild(p);
                }
                
                const imgCol = document.createElement('div');
                imgCol.className = 'seo-image-wrapper';
                if (block.imageUrl) {
                    const img = document.createElement('img');
                    img.src = block.imageUrl; // Validated in admin
                    img.alt = block.imageAlt || block.heading || 'Gipfel Lodge';
                    // basic security check for url
                    if (img.src.startsWith('http') || img.src.startsWith('/')) {
                        imgCol.appendChild(img);
                    }
                }
                
                wrapper.appendChild(textCol);
                wrapper.appendChild(imgCol);
                break;

            case 'uspGrid':
                wrapper.className = 'seo-usp-grid';
                if (Array.isArray(block.items)) {
                    const grid = document.createElement('div');
                    grid.className = 'seo-usp-container';
                    block.items.forEach(item => {
                        const cell = document.createElement('div');
                        cell.className = 'seo-usp-item';
                        if (item.title) {
                            const h3 = document.createElement('h3');
                            h3.textContent = item.title;
                            cell.appendChild(h3);
                        }
                        if (item.text) {
                            const p = document.createElement('p');
                            p.textContent = item.text;
                            cell.appendChild(p);
                        }
                        grid.appendChild(cell);
                    });
                    wrapper.appendChild(grid);
                }
                break;

            case 'cta':
                wrapper.className = 'seo-cta-block';
                if (block.heading) {
                    const h2 = document.createElement('h2');
                    h2.textContent = block.heading;
                    wrapper.appendChild(h2);
                }
                if (block.text) {
                    const p = document.createElement('p');
                    p.textContent = block.text;
                    wrapper.appendChild(p);
                }
                if (block.buttonLabel && block.buttonUrl) {
                    const a = document.createElement('a');
                    a.className = 'btn-primary';
                    a.href = block.buttonUrl;
                    a.textContent = block.buttonLabel;
                    wrapper.appendChild(a);
                }
                break;

            case 'internalLinks':
                wrapper.className = 'seo-internal-links';
                if (block.heading) {
                    const h2 = document.createElement('h2');
                    h2.textContent = block.heading;
                    wrapper.appendChild(h2);
                }
                if (Array.isArray(block.links)) {
                    const linkContainer = document.createElement('div');
                    linkContainer.className = 'seo-links-container';
                    block.links.forEach(link => {
                        if (link.label && link.url) {
                            const a = document.createElement('a');
                            a.className = 'seo-internal-link';
                            a.href = link.url;
                            a.textContent = link.label;
                            linkContainer.appendChild(a);
                        }
                    });
                    wrapper.appendChild(linkContainer);
                }
                break;

            default:
                return null;
        }

        return wrapper;
    }

    renderFAQ(faqItems) {
        const wrapper = document.createElement('div');
        wrapper.className = 'seo-faq-block';
        
        const h2 = document.createElement('h2');
        h2.textContent = 'Veelgestelde Vragen';
        wrapper.appendChild(h2);

        faqItems.forEach(item => {
            if (!item.question || !item.answer) return;
            
            const faqItem = document.createElement('div');
            faqItem.className = 'seo-faq-item';
            
            const q = document.createElement('h3');
            q.className = 'seo-faq-question';
            q.textContent = item.question;
            
            const a = document.createElement('p');
            a.className = 'seo-faq-answer';
            a.textContent = item.answer;

            faqItem.appendChild(q);
            faqItem.appendChild(a);
            wrapper.appendChild(faqItem);
        });

        return wrapper;
    }

    showLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '<div class="seo-loading-state"><div class="seo-loading-spinner"></div></div>';
        }
    }
}

window.seoPageRenderer = new SEOPageRenderer();
