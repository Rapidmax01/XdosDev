// CYBERPUNK INTERACTIVE SYSTEM - XDOSDEV

class CyberSystem {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.startSystemAnimations();
    }

    init() {
        this.isLoaded = false;
        this.glitchInterval = null;
        this.terminalTypewriter = null;
        this.initializeSystem();
    }

    initializeSystem() {
        // System startup sequence
        this.displaySystemBoot();
        setTimeout(() => {
            this.isLoaded = true;
            this.initializeComponents();
        }, 3000);
    }

    displaySystemBoot() {
        // Create boot screen
        const bootScreen = document.createElement('div');
        bootScreen.className = 'boot-screen';
        bootScreen.innerHTML = `
            <div class="boot-content">
                <div class="boot-logo">
                    <span class="boot-brackets">[</span>XDOSDEV<span class="boot-brackets">]</span>
                </div>
                <div class="boot-text">
                    <div class="boot-line">INITIALIZING DIGITAL SOLUTION MATRIX...</div>
                    <div class="boot-line">LOADING CYBERPUNK INTERFACE...</div>
                    <div class="boot-line">ESTABLISHING SECURE CONNECTIONS...</div>
                    <div class="boot-line">SYSTEM READY.</div>
                </div>
                <div class="boot-progress">
                    <div class="progress-bar"></div>
                </div>
            </div>
        `;

        // Add boot screen styles
        const bootStyles = `
            .boot-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: 'Orbitron', monospace;
                color: #00ffff;
            }
            .boot-content {
                text-align: center;
                max-width: 600px;
            }
            .boot-logo {
                font-size: 3rem;
                font-weight: 900;
                margin-bottom: 2rem;
                text-shadow: 0 0 20px #00ffff;
            }
            .boot-brackets {
                color: #ff00ff;
            }
            .boot-text {
                margin-bottom: 2rem;
            }
            .boot-line {
                font-size: 1rem;
                margin-bottom: 1rem;
                opacity: 0;
                animation: bootLineAppear 0.5s ease forwards;
            }
            .boot-line:nth-child(2) { animation-delay: 0.5s; }
            .boot-line:nth-child(3) { animation-delay: 1s; }
            .boot-line:nth-child(4) { animation-delay: 1.5s; }
            .boot-progress {
                width: 400px;
                height: 4px;
                background: #333;
                margin: 0 auto;
                overflow: hidden;
            }
            .progress-bar {
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #00ffff, #ff00ff);
                animation: bootProgress 2s ease forwards 1s;
            }
            @keyframes bootLineAppear {
                to { opacity: 1; }
            }
            @keyframes bootProgress {
                to { width: 100%; }
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = bootStyles;
        document.head.appendChild(styleElement);
        document.body.appendChild(bootScreen);

        // Remove boot screen after animation
        setTimeout(() => {
            bootScreen.style.opacity = '0';
            bootScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                bootScreen.remove();
                styleElement.remove();
            }, 500);
        }, 3000);
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Scroll effects
        this.setupScrollEffects();
        
        // Interactive elements
        this.setupInteractiveElements();
        
        // Form handling
        this.setupFormHandling();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                this.animateHamburger(navToggle);
            });
        }

        // Smooth scroll with cyber effect
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    this.cyberScroll(target);
                    if (navMenu) navMenu.classList.remove('active');
                }
            });
        });

        // Nav link hover effects
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                this.glitchText(link, 200);
            });
        });
    }

    animateHamburger(toggle) {
        const lines = toggle.querySelectorAll('.toggle-line');
        lines.forEach((line, index) => {
            line.style.transform = toggle.classList.contains('active') ? 
                `rotate(${index === 1 ? 0 : index === 0 ? 45 : -45}deg)` : 
                'rotate(0deg)';
        });
    }

    cyberScroll(target) {
        // Add glitch effect during scroll
        target.style.filter = 'hue-rotate(180deg)';
        target.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            target.style.filter = 'none';
        }, 500);
    }

    setupScrollEffects() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateScrollEffects();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Intersection Observer for animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // Observe elements
        document.querySelectorAll('.service-module, .project-card, .stat-box, .tech-node').forEach(el => {
            observer.observe(el);
        });
    }

    updateScrollEffects() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        // Parallax background elements
        const heroGrid = document.querySelector('.hero-grid');
        if (heroGrid) {
            heroGrid.style.transform = `translateY(${rate}px)`;
        }

        // Update navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (scrolled > 100) {
                navbar.style.background = 'rgba(10, 10, 10, 0.98)';
                navbar.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.2)';
            } else {
                navbar.style.background = 'rgba(10, 10, 10, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        }
    }

    animateElement(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100);

        // Special effects for different elements
        if (element.classList.contains('service-module')) {
            this.pulseGlow(element);
        } else if (element.classList.contains('project-card')) {
            this.slideInFromSide(element);
        } else if (element.classList.contains('stat-box')) {
            this.animateStats(element);
        }
    }

    pulseGlow(element) {
        element.addEventListener('mouseenter', () => {
            element.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(0, 255, 255, 0.3)';
            element.style.transform = 'translateY(-10px) scale(1.02)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.boxShadow = '';
            element.style.transform = '';
        });
    }

    slideInFromSide(element) {
        const isEven = Array.from(element.parentNode.children).indexOf(element) % 2 === 0;
        element.style.transform = `translateX(${isEven ? '-100px' : '100px'}) translateY(30px)`;
        
        setTimeout(() => {
            element.style.transform = 'translateX(0) translateY(0)';
        }, 200);
    }

    animateStats(element) {
        const statNumber = element.querySelector('.stat-number');
        const statProgress = element.querySelector('.stat-progress');
        
        if (statNumber) {
            const targetValue = statNumber.textContent.replace(/[^\d]/g, '');
            const hasPercent = statNumber.textContent.includes('%');
            const hasPlus = statNumber.textContent.includes('+');
            
            this.countUp(statNumber, 0, parseInt(targetValue), 2000, hasPercent, hasPlus);
        }

        if (statProgress) {
            const targetWidth = statProgress.style.width;
            statProgress.style.width = '0%';
            setTimeout(() => {
                statProgress.style.width = targetWidth;
            }, 500);
        }
    }

    countUp(element, start, end, duration, hasPercent = false, hasPlus = false) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOut);
            
            let displayValue = current.toString();
            if (hasPercent) displayValue += '%';
            if (hasPlus) displayValue += '+';
            
            element.textContent = displayValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    setupInteractiveElements() {
        // Button hover effects
        document.querySelectorAll('.btn-cyber').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.glitchButton(btn);
            });
        });

        // Service module interactions
        document.querySelectorAll('.service-module').forEach(module => {
            module.addEventListener('click', () => {
                this.activateModule(module);
            });
        });

        // Project card interactions
        document.querySelectorAll('.project-card').forEach(card => {
            this.setupProjectCard(card);
        });

        // Filter functionality
        this.setupProjectFilters();

        // Tech node interactions
        document.querySelectorAll('.tech-node').forEach(node => {
            this.setupTechNode(node);
        });
    }

    glitchButton(button) {
        const text = button.querySelector('.btn-text');
        const originalText = text.textContent;
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        
        let iterations = 0;
        const maxIterations = 10;
        
        const interval = setInterval(() => {
            text.textContent = text.textContent
                .split('')
                .map((letter, index) => {
                    if (index < iterations) {
                        return originalText[index];
                    }
                    return glitchChars[Math.floor(Math.random() * glitchChars.length)];
                })
                .join('');
            
            if (iterations >= originalText.length) {
                clearInterval(interval);
                text.textContent = originalText;
            }
            
            iterations += 1/3;
        }, 50);
    }

    activateModule(module) {
        // Flash effect
        module.style.background = 'rgba(0, 255, 255, 0.2)';
        module.style.transform = 'scale(1.05)';
        
        // Create particle effect
        this.createParticles(module);
        
        setTimeout(() => {
            module.style.background = '';
            module.style.transform = '';
        }, 300);
    }

    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const particles = [];
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: #00ffff;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${rect.left + rect.width/2}px;
                top: ${rect.top + rect.height/2}px;
                box-shadow: 0 0 10px #00ffff;
            `;
            
            document.body.appendChild(particle);
            particles.push(particle);
            
            // Animate particle
            const angle = (i / 20) * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            const dx = Math.cos(angle) * velocity;
            const dy = Math.sin(angle) * velocity;
            
            let x = 0, y = 0, opacity = 1;
            
            const animate = () => {
                x += dx;
                y += dy;
                opacity -= 0.02;
                
                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;
                
                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    setupProjectCard(card) {
        const visual = card.querySelector('.project-visual');
        
        card.addEventListener('mouseenter', () => {
            // Holographic effect
            card.style.background = 'linear-gradient(45deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1))';
            
            // Animate project visual
            if (visual) {
                visual.style.transform = 'rotateY(10deg) rotateX(5deg)';
                visual.style.filter = 'brightness(1.2) contrast(1.1)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = '';
            if (visual) {
                visual.style.transform = '';
                visual.style.filter = '';
            }
        });

        // Click effect
        card.addEventListener('click', () => {
            this.launchProjectEffect(card);
        });
    }

    launchProjectEffect(card) {
        const rect = card.getBoundingClientRect();
        
        // Create launch effect
        const launchBeam = document.createElement('div');
        launchBeam.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: linear-gradient(45deg, transparent, rgba(0,255,255,0.5), transparent);
            border: 2px solid #00ffff;
            border-radius: 8px;
            pointer-events: none;
            z-index: 9999;
            animation: launchPulse 0.6s ease;
        `;
        
        const keyframes = `
            @keyframes launchPulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1.2); opacity: 0; }
            }
        `;
        
        if (!document.querySelector('#launch-keyframes')) {
            const style = document.createElement('style');
            style.id = 'launch-keyframes';
            style.textContent = keyframes;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(launchBeam);
        
        setTimeout(() => {
            launchBeam.remove();
        }, 600);
    }

    setupProjectFilters() {
        const filterTabs = document.querySelectorAll('.filter-tab');
        const projectCards = document.querySelectorAll('.project-card');
        
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Filter projects
                const filter = tab.getAttribute('data-filter');
                this.filterProjects(projectCards, filter);
                
                // Glitch effect on filter change
                this.glitchText(tab, 300);
            });
        });
    }

    filterProjects(cards, filter) {
        cards.forEach((card, index) => {
            const cardType = card.getAttribute('data-type');
            const shouldShow = filter === 'all' || cardType === filter;
            
            if (shouldShow) {
                card.style.display = 'block';
                // Stagger animation
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }, index * 100);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px) scale(0.8)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    }

    setupTechNode(node) {
        const core = node.querySelector('.node-core');
        
        node.addEventListener('mouseenter', () => {
            // Pulsing core effect
            core.style.animation = 'none';
            core.style.background = '#ff00ff';
            core.style.boxShadow = '0 0 20px #ff00ff, 0 0 40px #ff00ff';
            core.style.transform = 'scale(1.2)';
            
            // Create orbital rings
            this.createOrbitalRings(node);
        });

        node.addEventListener('mouseleave', () => {
            core.style.background = '';
            core.style.boxShadow = '';
            core.style.transform = '';
            
            // Remove orbital rings
            node.querySelectorAll('.orbital-ring').forEach(ring => ring.remove());
        });
    }

    createOrbitalRings(node) {
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = 'orbital-ring';
            ring.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${30 + i * 10}px;
                height: ${30 + i * 10}px;
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: orbit${i} ${2 + i}s linear infinite;
                pointer-events: none;
            `;
            
            node.appendChild(ring);
        }
        
        // Add orbital animations if not already present
        if (!document.querySelector('#orbital-keyframes')) {
            const style = document.createElement('style');
            style.id = 'orbital-keyframes';
            style.textContent = `
                @keyframes orbit0 { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
                @keyframes orbit1 { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(-360deg); } }
                @keyframes orbit2 { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }
    }

    setupFormHandling() {
        const form = document.querySelector('#contactForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processFormSubmission(form);
            });
            
            // Input field effects
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    this.activateInput(input);
                });
                
                input.addEventListener('blur', () => {
                    this.deactivateInput(input);
                });
            });
        }
    }

    activateInput(input) {
        const field = input.closest('.input-field');
        const label = field.querySelector('.input-label');
        
        field.style.background = 'rgba(0, 255, 255, 0.05)';
        label.style.color = '#00ffff';
        label.style.textShadow = '0 0 10px #00ffff';
    }

    deactivateInput(input) {
        const field = input.closest('.input-field');
        const label = field.querySelector('.input-label');
        
        field.style.background = '';
        label.style.color = '';
        label.style.textShadow = '';
    }

    processFormSubmission(form) {
        const submitBtn = form.querySelector('.btn-cyber.submit');
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        
        // Loading state
        submitBtn.querySelector('.btn-text').textContent = 'TRANSMITTING...';
        submitBtn.style.pointerEvents = 'none';
        
        // Create transmission effect
        this.createTransmissionEffect(form);
        
        // Get form data
        const formData = new FormData(form);
        
        // Submit to Formspree
        fetch(form.action, {
            method: form.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                // Success
                submitBtn.querySelector('.btn-text').textContent = 'TRANSMISSION_COMPLETE';
                submitBtn.style.borderColor = '#39ff14';
                submitBtn.style.color = '#39ff14';
                
                // Create success message
                this.showFormMessage(form, 'success', 'MESSAGE TRANSMITTED SUCCESSFULLY! We will respond within 24 hours.');
                
                form.reset();
            } else {
                // Error
                submitBtn.querySelector('.btn-text').textContent = 'TRANSMISSION_FAILED';
                submitBtn.style.borderColor = '#ff0080';
                submitBtn.style.color = '#ff0080';
                
                this.showFormMessage(form, 'error', 'TRANSMISSION FAILED. Please try again or email directly to info@xdosdev.com');
            }
        }).catch(error => {
            submitBtn.querySelector('.btn-text').textContent = 'CONNECTION_ERROR';
            submitBtn.style.borderColor = '#ff0080';
            submitBtn.style.color = '#ff0080';
            
            this.showFormMessage(form, 'error', 'CONNECTION ERROR. Please check your internet and try again.');
        }).finally(() => {
            setTimeout(() => {
                submitBtn.querySelector('.btn-text').textContent = originalText;
                submitBtn.style.borderColor = '';
                submitBtn.style.color = '';
                submitBtn.style.pointerEvents = '';
            }, 3000);
        });
    }

    showFormMessage(form, type, message) {
        // Remove any existing messages
        const existingMessage = form.parentElement.querySelector('.form-message');
        if (existingMessage) existingMessage.remove();
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'form-message';
        messageDiv.style.cssText = `
            margin-top: 20px;
            padding: 20px;
            border: 2px solid ${type === 'success' ? '#39ff14' : '#ff0080'};
            background: rgba(${type === 'success' ? '57, 255, 20' : '255, 0, 128'}, 0.1);
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            color: ${type === 'success' ? '#39ff14' : '#ff0080'};
            text-align: center;
            font-weight: 600;
            animation: messageSlide 0.5s ease;
            text-shadow: 0 0 10px currentColor;
        `;
        
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 1.5rem;">${type === 'success' ? '✓' : '⚠'}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Add animation
        const keyframes = `
            @keyframes messageSlide {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        
        if (!document.querySelector('#message-keyframes')) {
            const style = document.createElement('style');
            style.id = 'message-keyframes';
            style.textContent = keyframes;
            document.head.appendChild(style);
        }
        
        // Insert message after form
        form.parentElement.appendChild(messageDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-20px)';
            setTimeout(() => messageDiv.remove(), 500);
        }, 10000);
    }

    createTransmissionEffect(form) {
        const rect = form.getBoundingClientRect();
        const scanLines = [];
        
        for (let i = 0; i < 5; i++) {
            const scanLine = document.createElement('div');
            scanLine.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top + (i * rect.height / 5)}px;
                width: ${rect.width}px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00ffff, transparent);
                pointer-events: none;
                z-index: 9999;
                opacity: 0.8;
                animation: scanTransmit 2s ease-in-out;
            `;
            
            document.body.appendChild(scanLine);
            scanLines.push(scanLine);
        }
        
        // Add scan animation
        const scanKeyframes = `
            @keyframes scanTransmit {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        
        if (!document.querySelector('#scan-keyframes')) {
            const style = document.createElement('style');
            style.id = 'scan-keyframes';
            style.textContent = scanKeyframes;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            scanLines.forEach(line => line.remove());
        }, 2000);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + Shift + C: Toggle cyber mode
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
                e.preventDefault();
                this.toggleCyberMode();
            }
            
            // Ctrl + Shift + G: Trigger global glitch
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') {
                e.preventDefault();
                this.globalGlitch();
            }
        });
    }

    toggleCyberMode() {
        document.body.classList.toggle('ultra-cyber');
        
        const ultraStyles = `
            .ultra-cyber {
                filter: hue-rotate(180deg) saturate(150%);
                animation: globalPulse 2s ease-in-out infinite;
            }
            @keyframes globalPulse {
                0%, 100% { filter: hue-rotate(180deg) saturate(150%); }
                50% { filter: hue-rotate(270deg) saturate(200%) contrast(120%); }
            }
        `;
        
        if (!document.querySelector('#ultra-cyber-styles')) {
            const style = document.createElement('style');
            style.id = 'ultra-cyber-styles';
            style.textContent = ultraStyles;
            document.head.appendChild(style);
        }
    }

    globalGlitch() {
        document.body.style.animation = 'globalGlitch 0.5s ease';
        
        const glitchKeyframes = `
            @keyframes globalGlitch {
                0% { transform: translateX(0); }
                10% { transform: translateX(-5px); filter: hue-rotate(90deg); }
                20% { transform: translateX(5px); filter: hue-rotate(180deg); }
                30% { transform: translateX(-3px); filter: hue-rotate(270deg); }
                40% { transform: translateX(3px); filter: hue-rotate(360deg); }
                50% { transform: translateX(-2px); filter: invert(1); }
                60% { transform: translateX(2px); filter: invert(0); }
                70% { transform: translateX(-1px); }
                80% { transform: translateX(1px); }
                100% { transform: translateX(0); filter: none; }
            }
        `;
        
        if (!document.querySelector('#global-glitch-keyframes')) {
            const style = document.createElement('style');
            style.id = 'global-glitch-keyframes';
            style.textContent = glitchKeyframes;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }

    glitchText(element, duration = 500) {
        const text = element.textContent;
        const glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        let iterations = 0;
        
        const interval = setInterval(() => {
            element.textContent = text
                .split('')
                .map((char, index) => {
                    if (index < iterations) {
                        return text[index];
                    }
                    return glitchChars[Math.floor(Math.random() * glitchChars.length)];
                })
                .join('');
            
            if (iterations >= text.length) {
                clearInterval(interval);
            }
            
            iterations += 1/3;
        }, 30);
        
        setTimeout(() => {
            clearInterval(interval);
            element.textContent = text;
        }, duration);
    }

    startSystemAnimations() {
        // Matrix rain effect
        this.initMatrixRain();
        
        // Terminal typewriter
        this.initTerminalTypewriter();
        
        // Status updates
        this.initStatusUpdates();
    }

    initMatrixRain() {
        const matrixBg = document.querySelector('.matrix-bg');
        if (!matrixBg) return;
        
        // Create matrix characters
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        
        setInterval(() => {
            if (Math.random() < 0.1) {
                const char = document.createElement('div');
                char.textContent = chars[Math.floor(Math.random() * chars.length)];
                char.style.cssText = `
                    position: absolute;
                    top: -20px;
                    left: ${Math.random() * 100}%;
                    color: #00ff00;
                    font-family: 'Orbitron', monospace;
                    font-size: 14px;
                    opacity: 0.3;
                    pointer-events: none;
                    animation: matrixFall 3s linear forwards;
                `;
                
                matrixBg.appendChild(char);
                
                setTimeout(() => char.remove(), 3000);
            }
        }, 200);
        
        const matrixKeyframes = `
            @keyframes matrixFall {
                to {
                    top: 100vh;
                    opacity: 0;
                }
            }
        `;
        
        if (!document.querySelector('#matrix-keyframes')) {
            const style = document.createElement('style');
            style.id = 'matrix-keyframes';
            style.textContent = matrixKeyframes;
            document.head.appendChild(style);
        }
    }

    initTerminalTypewriter() {
        const terminalLines = document.querySelectorAll('.terminal-line .command, .terminal-line .output');
        
        terminalLines.forEach((line, index) => {
            const text = line.textContent;
            line.textContent = '';
            
            setTimeout(() => {
                this.typeWriter(line, text, 50);
            }, index * 1000);
        });
    }

    typeWriter(element, text, speed) {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    initStatusUpdates() {
        const statusValues = document.querySelectorAll('.status-value');
        
        setInterval(() => {
            statusValues.forEach(status => {
                if (status.textContent === 'ONLINE') {
                    // Simulate brief connection fluctuation
                    if (Math.random() < 0.05) {
                        status.textContent = 'SYNCING';
                        status.style.color = '#ffff00';
                        
                        setTimeout(() => {
                            status.textContent = 'ONLINE';
                            status.style.color = '#39ff14';
                        }, 500);
                    }
                }
            });
        }, 5000);
    }

    initializeComponents() {
        // Initialize all interactive components
        this.startSystemAnimations();
        
        // Add easter egg
        console.log(`
    ╔═══════════════════════════════════════╗
    ║          XDOSDEV CYBER SYSTEM         ║
    ║     Digital Solutions Engineering     ║
    ║                                       ║
    ║  Shortcuts:                           ║
    ║  Ctrl+Shift+C : Toggle Cyber Mode    ║
    ║  Ctrl+Shift+G : Global Glitch        ║
    ╚═══════════════════════════════════════╝
        `);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CyberSystem();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Re-activate animations when page becomes visible
        document.body.style.animation = 'systemReboot 1s ease';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1000);
    }
});

// Add system reboot animation
const rebootKeyframes = `
    @keyframes systemReboot {
        0% { opacity: 0.5; filter: brightness(0.5); }
        50% { opacity: 0.8; filter: brightness(1.2) hue-rotate(90deg); }
        100% { opacity: 1; filter: none; }
    }
`;

if (!document.querySelector('#reboot-keyframes')) {
    const style = document.createElement('style');
    style.id = 'reboot-keyframes';
    style.textContent = rebootKeyframes;
    document.head.appendChild(style);
}