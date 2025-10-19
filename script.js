// 当整个HTML文档加载并解析完毕后，执行此函数
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 获取所有需要操作的DOM元素 ---
    const textInput = document.getElementById('text-input');
    const canvas = document.getElementById('handwriting-canvas');
    const ctx = canvas.getContext('2d');

    const fontSelect = document.getElementById('font-select');
    const fontSizeInput = document.getElementById('font-size-input');
    const fontSizeValue = document.getElementById('font-size-value');
    const lineHeightInput = document.getElementById('line-height-input');
    const lineHeightValue = document.getElementById('line-height-value');
    const colorPicker = document.getElementById('color-picker');
    const paperOptions = document.querySelectorAll('.paper-option');
    const downloadBtn = document.getElementById('download-btn');
    const fontPreviewButtons = document.querySelectorAll('.font-preview-btn');
    const swatchButtons = document.querySelectorAll('.swatch-btn');
    const clearBtn = document.getElementById('clear-btn');
    const getStartedBtn = document.getElementById('get-started-btn');

    // --- 2. 定义纸张背景资源 ---
    // 将纸张背景的URL和颜色预先定义好，方便管理
    const paperStyles = {
        paper1: { type: 'image', value: './paper/paper-1.jpg' },
        paper2: { type: 'image', value: './paper/paper-2.jpg' },
        paper4: { type: 'image', value: './paper/paper-4.jpg' }
    };
    let currentPaper = 'paper1'; // 默认纸张样式

    // 创建一个Image对象池，用于预加载和复用背景图片，提高性能
    const paperImages = {};
    for (const key in paperStyles) {
        if (paperStyles[key].type === 'image') {
            const img = new Image();
            // 对于本地文件，不需要设置crossOrigin
            // img.crossOrigin = "anonymous";
            img.src = paperStyles[key].value;
            paperImages[key] = img;
        }
    }


    // --- 3. 初始化Canvas尺寸 ---
    // 使用ResizeObserver可以更可靠地监听元素尺寸变化
    const setupCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        drawText();
    };


    // --- 4. 同步textarea样式函数 ---
    const syncTextareaStyle = () => {
        const font = fontSelect.value;
        const fontSize = fontSizeInput.value;
        const lhMultiplier = parseFloat(lineHeightInput?.value || '1.8');
        const lineHeight = fontSize * lhMultiplier;
        const padding = 40;
        
        // 确保textarea的所有影响文本位置的属性都和canvas绘制时完全一致
        textInput.style.fontFamily = font;
        textInput.style.fontSize = `${fontSize}px`;
        textInput.style.lineHeight = `${lineHeight}px`;
        textInput.style.padding = `${padding}px`;
        
        // 让Font Style选择框也显示对应的字体
        fontSelect.style.fontFamily = font;
    };

    // --- 5. 核心绘制函数 ---
    const drawText = () => {
        // a. 获取所有设置的值
        const text = textInput.value;
        const font = fontSelect.value;
        const fontSize = fontSizeInput.value;
        const color = colorPicker.value;
        const lhMultiplier = parseFloat(lineHeightInput?.value || '1.8');
        const lineHeight = fontSize * lhMultiplier; // 根据新UI行距倍率

        // b. 清空画布并绘制背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const style = paperStyles[currentPaper];
        if (style.type === 'color') {
            ctx.fillStyle = style.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawContent(); // 颜色填充完成后，直接绘制内容
        } else if (style.type === 'image') {
            const img = paperImages[currentPaper];
            // 确保图片已加载完成
            if (img.complete) {
                const pattern = ctx.createPattern(img, 'repeat');
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawContent(); // 背景图绘制完成后，绘制内容
            } else {
                // 如果图片未加载完成，则在加载后重绘
                img.onload = () => {
                    drawText();
                };
            }
        }

        // c. 将实际的文字绘制逻辑封装起来
        function drawContent() {
            ctx.font = `${fontSize}px ${font}`;
            ctx.fillStyle = color;
            ctx.textBaseline = 'top';

            const padding = 40;
            const maxWidth = canvas.width / (window.devicePixelRatio || 1) - (padding * 2);
            
            // 处理自动换行的函数（模拟浏览器 overflow-wrap: break-word 行为）
            function wrapText(text, maxWidth) {
                // 如果文本为空，返回空数组
                if (!text) return [''];
                
                const lines = [];
                let currentLine = '';

                // 按空格分割单词
                const words = text.split(' ');
                
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const separator = currentLine ? ' ' : '';
                    const testLine = currentLine + separator + word;
                    
                    // 测试加入这个单词后是否超出宽度
                    if (ctx.measureText(testLine).width <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        // 超出宽度
                        if (currentLine) {
                            // 如果当前行有内容，先保存当前行
                            lines.push(currentLine);
                            currentLine = word;
                            
                            // 检查单个单词是否也超出宽度
                            if (ctx.measureText(word).width > maxWidth) {
                                // 长单词需要拆分
                                currentLine = '';
                                let charLine = '';
                                for (let char of word) {
                                    const testChar = charLine + char;
                                    if (ctx.measureText(testChar).width > maxWidth) {
                                        if (charLine) lines.push(charLine);
                                        charLine = char;
                                    } else {
                                        charLine = testChar;
                                    }
                                }
                                currentLine = charLine;
                            }
                        } else {
                            // 当前行为空，但单词太长，需要拆分
                            let charLine = '';
                            for (let char of word) {
                                const testChar = charLine + char;
                                if (ctx.measureText(testChar).width > maxWidth) {
                                    if (charLine) lines.push(charLine);
                                    charLine = char;
                                } else {
                                    charLine = testChar;
                                }
                            }
                            currentLine = charLine;
                        }
                    }
                }
                
                if (currentLine) lines.push(currentLine);
                return lines.length > 0 ? lines : [''];
            }

            // 处理原始文本，先按\n分割，再对每行进行自动换行
            const originalLines = text.split('\n');
            let allLines = [];
            originalLines.forEach(line => {
                const wrappedLines = wrapText(line, maxWidth);
                allLines = allLines.concat(wrappedLines);
            });

            // 绘制所有行
            allLines.forEach((line, index) => {
                const y = (index * lineHeight) + padding;
                ctx.fillText(line, padding, y);
            });
        }
    };

    // --- 6. 设置事件监听器 ---

    // 监听所有输入和选择的变化
    textInput.addEventListener('input', drawText);
    fontSelect.addEventListener('change', () => {
        // 同步更新快速选择按钮的激活状态
        fontPreviewButtons.forEach(btn => btn.classList.remove('active'));
        const activeButton = document.querySelector(`[data-font="${fontSelect.value}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        syncTextareaStyle();
        drawText();
    });
    colorPicker.addEventListener('input', drawText); // 使用 'input' 事件实现实时颜色预览
    fontSizeInput.addEventListener('input', () => {
        fontSizeValue.textContent = `${fontSizeInput.value}px`;
        syncTextareaStyle();
        drawText();
    });
    if (lineHeightInput) {
        lineHeightInput.addEventListener('input', () => {
            const v = parseFloat(lineHeightInput.value).toFixed(2);
            lineHeightValue.textContent = `${v}x`;
            syncTextareaStyle();
            drawText();
        });
    }

    // 字体快速选择按钮事件
    fontPreviewButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的 active 类
            fontPreviewButtons.forEach(btn => btn.classList.remove('active'));
            // 为当前按钮添加 active 类
            button.classList.add('active');
            // 更新字体选择器
            const selectedFont = button.dataset.font;
            fontSelect.value = selectedFont;
            // 同步样式并重绘
            syncTextareaStyle();
            drawText();
        });
    });

    // 纸张选择器的点击事件
    paperOptions.forEach(option => {
        option.addEventListener('click', () => {
            // 移除所有选项的 'active' class
            paperOptions.forEach(opt => opt.classList.remove('active'));
            // 为当前点击的选项添加 'active' class
            option.classList.add('active');
            // 更新当前纸张样式并重绘
            currentPaper = option.dataset.paper;
            drawText();
        });
    });

    // 色板按钮
    swatchButtons.forEach(btn => {
        // 如果是纯色按钮，根据 data-color 设置背景色
        const color = btn.dataset.color;
        if (color) {
            btn.style.backgroundColor = color;
        }
        btn.addEventListener('click', () => {
            swatchButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.classList.contains('swatch-custom')) {
                colorPicker.click();
            } else if (color) {
                colorPicker.value = color;
                drawText();
            }
        });
    });

    // 清空按钮
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            textInput.value = '';
            drawText();
            textInput.focus();
        });
    }

    // Header CTA 平滑滚动（额外保证）
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', (e) => {
            // 让浏览器内置 smooth-scroll 生效的同时，确保定位
            const anchor = document.getElementById('editor');
            if (anchor) {
                e.preventDefault();
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // 下载按钮
    downloadBtn.addEventListener('click', () => {
        try {
            // 确保canvas有内容
            if (canvas.width === 0 || canvas.height === 0) {
                alert('请等待画布加载完成');
                return;
            }
            
            // 禁用按钮，防止重复点击
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Downloading...';
            
            // 短暂延迟以显示加载状态
            setTimeout(() => {
                try {
                    // 创建下载链接
                    const link = document.createElement('a');
                    const timestamp = new Date().getTime();
                    link.download = `handwriting_${timestamp}.png`;
                    link.href = canvas.toDataURL('image/png', 1.0);
                    
                    // 触发下载
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // 恢复按钮状态
                    downloadBtn.textContent = 'Download Image';
                    downloadBtn.disabled = false;
                    
                    console.log('图片下载成功');
                } catch (error) {
                    console.error('下载失败:', error);
                    let errorMsg = '下载失败！\n\n';
                    if (error.message.includes('Tainted') || error.message.includes('tainted')) {
                        errorMsg += '请使用本地服务器运行此网站：\n';
                        errorMsg += '1. 推荐使用 VS Code 的 Live Server 扩展\n';
                        errorMsg += '2. 或使用 Python: python -m http.server\n';
                        errorMsg += '3. 不要直接双击HTML文件打开\n\n';
                        errorMsg += '技术原因：Canvas 安全限制';
                    } else {
                        errorMsg += error.message;
                    }
                    alert(errorMsg);
                    downloadBtn.textContent = 'Download Image';
                    downloadBtn.disabled = false;
                }
            }, 100);
            
        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败，请重试');
            downloadBtn.textContent = 'Download Image';
            downloadBtn.disabled = false;
        }
    });

    // 监听窗口和元素尺寸变化
    // 使用 ResizeObserver 替代 window.resize, 性能更好且更准确
    const resizeObserver = new ResizeObserver(() => setupCanvas());
    resizeObserver.observe(canvas);

    // --- 7. 初始加载 ---
    // 先设置初始样式，确保textarea和canvas的文本位置从一开始就完全一致
    syncTextareaStyle();
    
    textInput.value = "Welcome to the new and improved\nText to Handwriting converter!\n\nEnjoy the modern look, extra fonts,\nand beautiful paper styles.";
    if (lineHeightInput && lineHeightValue) {
        const v = parseFloat(lineHeightInput.value).toFixed(2);
        lineHeightValue.textContent = `${v}x`;
    }
    
    // 设置初始字体选择状态
    const initialFont = fontSelect.value;
    fontPreviewButtons.forEach(btn => btn.classList.remove('active'));
    const initialButton = document.querySelector(`[data-font="${initialFont}"]`);
    if (initialButton) {
        initialButton.classList.add('active');
    }
    
    setupCanvas(); // 初始设置并绘制
    
    // 调试信息
    console.log('页面加载完成');
    console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
    console.log('下载按钮:', downloadBtn);

    // FAQ accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        const toggle = item.querySelector('.faq-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            // close others (optional)
            faqItems.forEach(i => {
                i.classList.remove('open');
                const t = i.querySelector('.faq-toggle');
                const b = i.querySelector('.faq-question');
                if (t) t.textContent = '+';
                if (b) b.setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('open');
                if (toggle) toggle.textContent = '−';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
});