// XDOSDEV - Main Script

class XdosDev {
    constructor() {
        this.setupNavigation();
        this.setupScrollEffects();
        this.setupProjectFilters();
        this.setupFormHandling();
        this.setupFadeInObserver();
        this.setupStatCountUp();
        this.setupImageFallbacks();
        this.setupChatWidget();
    }

    // --- Navigation ---
    setupNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                const isActive = navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
                navToggle.setAttribute('aria-expanded', isActive);
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    if (navMenu) navMenu.classList.remove('active');
                    if (navToggle) {
                        navToggle.classList.remove('active');
                        navToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }

    // --- Scroll Effects (navbar + active nav + scroll-to-top) ---
    setupScrollEffects() {
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');
        const scrollTopBtn = document.querySelector('.scroll-top');

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;

            // Navbar background
            if (navbar) {
                if (scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }

            // Active nav link
            let currentSection = '';
            sections.forEach(section => {
                const top = section.offsetTop - 120;
                if (scrollY >= top) {
                    currentSection = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentSection) {
                    link.classList.add('active');
                }
            });

            // Scroll to top button
            if (scrollTopBtn) {
                if (scrollY > 600) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            }
        }, { passive: true });

        // Scroll to top click
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // --- Fade-in Observer ---
    setupFadeInObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });
    }

    // --- Stat Count-Up ---
    setupStatCountUp() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCountUp(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        document.querySelectorAll('[data-target]').forEach(el => {
            observer.observe(el);
        });
    }

    animateCountUp(element) {
        const target = parseInt(element.getAttribute('data-target'));
        if (isNaN(target)) return;

        const duration = 2000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);

            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = target;
            }
        };

        requestAnimationFrame(animate);
    }

    // --- Project Filters ---
    setupProjectFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');

                projectCards.forEach(card => {
                    const type = card.getAttribute('data-type');
                    const shouldShow = filter === 'all' || type === filter;

                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    if (shouldShow) {
                        card.style.display = '';
                        requestAnimationFrame(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        });
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // --- Form Handling ---
    setupFormHandling() {
        const form = document.querySelector('#contactForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm(form);
        });
    }

    submitForm(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const formData = new FormData(form);

        fetch(form.action, {
            method: form.method,
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                this.showFormMessage(form, 'success', 'Message sent successfully! We\'ll get back to you within 24 hours.');
                form.reset();
            } else {
                this.showFormMessage(form, 'error', 'Something went wrong. Please try again or email us directly at info@xdosdev.com.');
            }
        }).catch(() => {
            this.showFormMessage(form, 'error', 'Connection error. Please check your internet and try again.');
        }).finally(() => {
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 3000);
        });
    }

    showFormMessage(form, type, message) {
        const existing = form.parentElement.querySelector('.form-message');
        if (existing) existing.remove();

        const div = document.createElement('div');
        div.className = `form-message ${type}`;
        div.textContent = message;

        form.parentElement.insertBefore(div, form.nextSibling);

        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.3s ease';
            setTimeout(() => div.remove(), 300);
        }, 8000);
    }

    // --- Chat Widget ---
    setupChatWidget() {
        const widget = document.querySelector('.chat-widget');
        const bubble = document.querySelector('.chat-bubble');
        const chatForm = document.getElementById('chatForm');
        const chatMessages = document.getElementById('chatMessages');
        const nameRow = document.getElementById('chatNameRow');
        const emailRow = document.getElementById('chatEmailRow');
        const msgRow = document.getElementById('chatMsgRow');
        const nameInput = document.getElementById('chatName');
        const emailInput = document.getElementById('chatEmail');
        const msgInput = document.getElementById('chatMsg');
        const scrollTopBtn = document.querySelector('.scroll-top');

        if (!widget || !bubble) return;

        let step = 'name'; // name -> email -> message
        let userName = '';
        let userEmail = '';

        bubble.addEventListener('click', () => {
            widget.classList.toggle('open');
            if (scrollTopBtn) {
                scrollTopBtn.style.bottom = widget.classList.contains('open') ? '100px' : '';
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (widget.classList.contains('open') && !widget.contains(e.target)) {
                widget.classList.remove('open');
                if (scrollTopBtn) scrollTopBtn.style.bottom = '';
            }
        });

        // Handle Enter key on name and email inputs
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!nameInput.value.trim()) return;
                userName = nameInput.value.trim();
                this.addChatMessage(chatMessages, userName, 'user');
                nameRow.style.display = 'none';
                emailRow.style.display = 'flex';
                emailInput.focus();
                this.addChatMessage(chatMessages, `Nice to meet you, ${userName}! What's your email so we can get back to you?`, 'bot');
                step = 'email';
            }
        });

        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!emailInput.value.trim() || !emailInput.checkValidity()) return;
                userEmail = emailInput.value.trim();
                this.addChatMessage(chatMessages, userEmail, 'user');
                emailRow.style.display = 'none';
                msgRow.style.display = 'flex';
                msgInput.focus();
                this.addChatMessage(chatMessages, 'Great! How can we help you today?', 'bot');
                step = 'message';
            }
        });

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (step === 'name') {
                if (!nameInput.value.trim()) return;
                nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                return;
            }
            if (step === 'email') {
                if (!emailInput.value.trim()) return;
                emailInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                return;
            }

            const message = msgInput.value.trim();
            if (!message) return;

            this.addChatMessage(chatMessages, message, 'user');
            msgInput.value = '';

            const sendBtn = chatForm.querySelector('.chat-send');
            sendBtn.disabled = true;

            const formData = new FormData();
            formData.append('name', userName);
            formData.append('email', userEmail);
            formData.append('message', message);
            formData.append('_subject', 'Chat message from ' + userName + ' via XdosDev');

            fetch(chatForm.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    this.addChatMessage(chatMessages, 'Thanks for your message! We\'ll get back to you at ' + userEmail + ' shortly.', 'bot');
                } else {
                    this.addChatMessage(chatMessages, 'Something went wrong. Please email us at info@xdosdev.com instead.', 'bot');
                }
            }).catch(() => {
                this.addChatMessage(chatMessages, 'Connection error. Please email us at info@xdosdev.com instead.', 'bot');
            }).finally(() => {
                sendBtn.disabled = false;
                msgInput.focus();
            });
        });
    }

    addChatMessage(container, text, type) {
        const msg = document.createElement('div');
        msg.className = `chat-msg chat-msg--${type === 'user' ? 'user' : 'bot'}`;
        msg.innerHTML = `<div class="chat-msg-bubble">${text}</div>`;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    // --- Image Error Fallbacks ---
    setupImageFallbacks() {
        document.querySelectorAll('.project-thumb img').forEach(img => {
            img.addEventListener('error', () => {
                img.classList.add('error');
                img.parentElement.style.background = 'linear-gradient(135deg, var(--primary), var(--accent))';
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new XdosDev();
});
