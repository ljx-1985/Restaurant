/**
 * @file 前端交互脚本
 * @description 处理用户输入，调用菜品推荐 API，并显示结果。
 */
document.addEventListener('DOMContentLoaded', () => {
    const recommendForm = document.getElementById('recommendForm');
    const diseasesInput = document.getElementById('diseases');
    const allergyMaskInput = document.getElementById('allergy_mask');  // 添加忌口输入
    const resultsOutput = document.getElementById('resultsOutput');
    const diseaseButtons = document.querySelectorAll('.disease-btn');
    const allergyButtons = document.querySelectorAll('.allergy-btn');  // 忌口按钮
    const flavorButtons = document.querySelectorAll('#flavorButtons .flavor-btn'); // 获取口味偏好按钮
    const continueRecommendBtn = document.getElementById('continueRecommendBtn');

    // 为基础情况按钮添加点击事件（改为多选模式）
    diseaseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentValue = parseInt(button.dataset.value, 10);
            const noneButton = document.querySelector('.disease-btn[data-value="0"]');

            if (currentValue === 0) {
                // 如果点击的是"无"按钮
                diseaseButtons.forEach(btn => {
                    if (btn !== button) {
                        btn.classList.remove('active');
                    }
                });
                button.classList.add('active');
                diseasesInput.value = 0;
            } else {
                // 如果点击的是其他情况按钮
                if (noneButton) {
                    noneButton.classList.remove('active');
                }
                button.classList.toggle('active'); // 切换当前按钮的激活状态

                let diseasesValue = 0;
                let isActiveSelected = false;
                diseaseButtons.forEach(btn => {
                    if (btn.classList.contains('active') && btn.dataset.value !== "0") {
                        diseasesValue |= parseInt(btn.dataset.value, 10);
                        isActiveSelected = true;
                    }
                });

                if (!isActiveSelected && noneButton) {
                    // 如果没有其他按钮被选中，则自动选中"无"
                    noneButton.classList.add('active');
                    diseasesInput.value = 0;
                } else {
                    diseasesInput.value = diseasesValue;
                }
            }
        });
    });

    // 为忌口按钮添加点击事件（多选模式）
    allergyButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 特殊处理：如果点击"无"，则清除所有其他选择
            if (button.dataset.value === "0") {
                allergyButtons.forEach(btn => {
                    if (btn.dataset.value !== "0") {
                        btn.classList.remove('active');
                    } else {
                        btn.classList.add('active');
                    }
                });
                allergyMaskInput.value = 0;
                return;
            }
            
            // 如果点击其他选项，移除"无"选项的高亮
            const noneButton = document.querySelector('.allergy-btn[data-value="0"]');
            if (noneButton) {
                noneButton.classList.remove('active');
            }
            
            // 切换当前按钮的高亮状态
            button.classList.toggle('active');
            
            // 计算所有选中的忌口的值总和
            let allergyMask = 0;
            document.querySelectorAll('.allergy-btn.active').forEach(activeBtn => {
                allergyMask |= parseInt(activeBtn.dataset.value, 10);
            });
            
            // 如果没有任何选择，则默认为"无"
            if (allergyMask === 0) {
                if (noneButton) {
                    noneButton.classList.add('active');
                }
            }
            
            // 更新隐藏的input值
            allergyMaskInput.value = allergyMask;
        });
    });

    // 为口味偏好按钮添加点击事件
    flavorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const isNoneButton = button.dataset.value === ""; // 检查是否是"无"按钮
            const noneButton = document.querySelector('#flavorButtons .flavor-btn[data-value=""]');

            if (isNoneButton) {
                // 如果点击的是"无"按钮
                flavorButtons.forEach(btn => {
                    if (btn !== button) {
                        btn.classList.remove('active');
                    }
                });
                button.classList.add('active');
            } else {
                // 如果点击的是其他口味按钮
                if (noneButton) {
                    noneButton.classList.remove('active'); // 取消"无"按钮的激活状态
                }
                button.classList.toggle('active'); // 切换当前按钮的激活状态

                // 检查是否有任何活动的口味按钮，如果没有，则激活"无"按钮
                let anyFlavorActive = false;
                flavorButtons.forEach(btn => {
                    if (btn.dataset.value !== "" && btn.classList.contains('active')) {
                        anyFlavorActive = true;
                    }
                });

                if (!anyFlavorActive && noneButton) {
                    noneButton.classList.add('active');
                }
            }
        });
    });

    // 已显示的菜品ID集合，用于确保不会重复推荐
    let displayedDishIds = new Set();
    
    // 当前用户选择的健康状况和忌口信息
    let currentUserPreferences = {
        diseases: 0,
        allergy_mask: 0
    };

    recommendForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 阻止表单默认提交行为

        const diseases = parseInt(diseasesInput.value, 10);
        const allergy_mask = parseInt(allergyMaskInput.value, 10);

        // 基本的客户端验证
        if (isNaN(diseases) || isNaN(allergy_mask)) {
            showErrorMessage('错误：基础情况或忌口数据格式不正确。');
            return;
        }

        // 重置已显示的菜品集合
        displayedDishIds.clear();
        
        // 保存当前用户选择
        currentUserPreferences = {
            diseases,
            allergy_mask
        };

        // 更新：获取口味偏好
        let flavorPreferences = [];
        const activeFlavorButtons = document.querySelectorAll('#flavorButtons .flavor-btn.active');
        activeFlavorButtons.forEach(btn => {
            if (btn.dataset.value !== "") { // 只添加非"无"按钮的值
                flavorPreferences.push(btn.dataset.value);
            }
        });
        // 如果只有"无"按钮是active，或者没有任何按钮是active（理论上后者不应发生，因为"无"会补位），
        // flavorPreferences 此时应为空数组，这是正确的。

        showLoadingMessage('正在推荐，请稍候...');

        try {
            const response = await fetch('/recommend', { // 使用推荐API端点
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...currentUserPreferences,
                    flavor_preferences: flavorPreferences
                }),
            });

            if (!response.ok) {
                // 尝试解析错误响应体
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // 如果错误响应不是JSON格式
                    throw new Error(`HTTP 错误 ${response.status} - ${response.statusText}`);
                }
                throw new Error(`API 错误 ${response.status}: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                displayDishCards(data, false);
                
                // 记录已显示的菜品ID
                data.forEach(dish => {
                    if (dish.id) {
                        displayedDishIds.add(dish.id);
                    }
                });
            } else if (Array.isArray(data) && data.length === 0) {
                showErrorMessage('未找到适合您情况的菜品，请尝试调整选择。');
            } else {
                showErrorMessage('收到的数据格式不正确。');
            }
        } catch (error) {
            console.error('推荐请求失败:', error);
            showErrorMessage(`请求错误: ${error.message}`);
        }
    });
    
    // 继续推荐按钮点击事件
    continueRecommendBtn.addEventListener('click', async () => {
        try {
            // 获取要排除的菜品ID列表
            const excludeIds = Array.from(displayedDishIds);
            
            // 更新：获取口味偏好
            let flavorPreferencesContinue = [];
            const activeFlavorButtonsContinue = document.querySelectorAll('#flavorButtons .flavor-btn.active');
            activeFlavorButtonsContinue.forEach(btn => {
                if (btn.dataset.value !== "") { // 只添加非"无"按钮的值
                    flavorPreferencesContinue.push(btn.dataset.value);
                }
            });
            
            const response = await fetch('/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...currentUserPreferences,
                    excludeIds: excludeIds, // 添加已显示的菜品ID，告诉后端排除这些
                    flavor_preferences: flavorPreferencesContinue // 使用更新后的偏好获取逻辑
                }),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    throw new Error(`HTTP 错误 ${response.status} - ${response.statusText}`);
                }
                throw new Error(`API 错误 ${response.status}: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                displayDishCards(data, false); // 修改此处，将 true 改为 false，实现替换效果
                
                // 更新已显示的菜品ID（继续累积，以便后续排除）
                data.forEach(dish => {
                    if (dish.id) {
                        displayedDishIds.add(dish.id);
                    }
                });
            } else if (Array.isArray(data) && data.length === 0) {
                console.log('没有更多符合条件的菜品了。');
                // 可以选择禁用按钮或给出提示，但目前根据之前的要求不显示文字提示
            } else {
                showErrorMessage('收到的数据格式不正确。');
            }
        } catch (error) {
            console.error('继续推荐请求失败:', error);
            showErrorMessage(`请求错误: ${error.message}`);
        }
    });

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    function showErrorMessage(message) {
        resultsOutput.innerHTML = `<p class="error-message">${message}</p>`;
    }

    /**
     * 显示一般信息
     * @param {string} message - 信息内容
     * @param {string} className - CSS类名
     */
    function showMessage(message, className) {
        resultsOutput.innerHTML += `<p class="${className}">${message}</p>`;
    }

    /**
     * 显示加载信息
     * @param {string} message - 加载信息
     */
    function showLoadingMessage(message) {
        resultsOutput.innerHTML = `<p class="loading-message">${message}</p>`;
    }

    /**
     * JSDoc注释：显示菜品卡片到UI
     * @param {Array<Object>} dishes - 要显示的菜品对象数组
     * @param {boolean} append - 是否追加到现有列表，默认为false (替换)
     */
    function displayDishCards(dishes, append = false) {
        const resultsDiv = document.getElementById('resultsOutput');
        const continueButtonContainer = document.querySelector('.continue-recommend-container');

        if (!append) {
            resultsDiv.innerHTML = ''; // 清除非追加模式下的旧内容
            displayedDishIds.clear(); // 清空已显示ID记录
        }

        if (dishes.length === 0 && !append) { // 初始推荐就没有结果
            resultsDiv.innerHTML = '<p class="placeholder-text">未找到适合您情况的菜品。</p>';
            if (continueButtonContainer) {
                continueButtonContainer.style.display = 'none';
            }
            return;
        }

        dishes.forEach(dish => {
            if (displayedDishIds.has(dish.id) && append) {
                return; // 如果是追加模式且菜品已显示，则跳过
            }
            const card = document.createElement('div');
            card.className = 'dish-card';
            card.innerHTML = `
                <h3>${dish.name} (${dish.category})</h3>
                <p>${dish.description}</p>
                ${dish.disease_suitable_readable && dish.disease_suitable_readable.length > 0 ?
                    `<p><strong>适合:</strong> ${dish.disease_suitable_readable.join(', ')}</p>` : ''}
            `;
            resultsDiv.appendChild(card);
            displayedDishIds.add(dish.id);
        });

        if (dishes.length > 0 && continueButtonContainer) { // 成功展示了菜品
            continueButtonContainer.style.display = 'flex';
        } else if (dishes.length === 0 && append && continueButtonContainer) { // 继续推荐没有更多菜品
            // resultsDiv.innerHTML += '<p class="placeholder-text">没有更多推荐了。</p>'; // 可选提示
            // 如果希望此时隐藏按钮，取消下一行注释
            // continueButtonContainer.style.display = 'none';
        }
    }

    /**
     * JSDoc注释：通过API获取菜品推荐
     * @param {boolean} append - 是否追加推荐结果到现有列表，默认为false (替换)
     */
    function fetchRecommendations(append = false) {
        const diseasesInput = document.getElementById('diseases');
        const allergiesInput = document.getElementById('allergies');
        const resultsDiv = document.getElementById('resultsOutput');
        const submitButton = document.getElementById('submitBtn');
        const continueButton = document.getElementById('continueRecommendBtn'); // 获取按钮本身，用于disable/enable
        const continueButtonContainer = document.querySelector('.continue-recommend-container');

        submitButton.disabled = true;
        submitButton.textContent = '正在获取推荐...';

        if (append) {
            continueButton.disabled = true;
            continueButton.textContent = '加载中...';
        } else {
            resultsDiv.innerHTML = '<p class="placeholder-text">正在为您加载推荐...</p>';
            if (continueButtonContainer) {
                continueButtonContainer.style.display = 'none'; // 初始获取时，先隐藏"继续推荐"区域
            }
        }

        const exclude_ids = append ? Array.from(displayedDishIds) : [];

        fetch('/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                preferences: {
                    diseases: parseInt(diseasesInput.value, 10),
                    allergy_mask: parseInt(allergiesInput.value, 10)
                },
                exclude_ids: exclude_ids
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                displayDishCards(data, append); // displayDishCards会处理按钮显示
            } else {
                if (!append) { // 初始推荐就没有结果
                    resultsDiv.innerHTML = '<p class="placeholder-text">未找到适合您情况的菜品。</p>';
                    if (continueButtonContainer) {
                        continueButtonContainer.style.display = 'none'; // 确保隐藏
                    }
                } else { // 继续推荐没有更多结果
                    resultsDiv.innerHTML += '<p class="placeholder-text">没有更多推荐了。</p>';
                     if (continueButtonContainer) {
                        // 如果希望"继续推荐"无结果时也隐藏按钮，取消下一行注释
                        // continueButtonContainer.style.display = 'none';
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            resultsDiv.innerHTML = '<p class="placeholder-text">获取推荐失败，请检查网络或稍后再试。</p>';
            if (continueButtonContainer) {
                continueButtonContainer.style.display = 'none'; // 出错时隐藏
            }
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = '获取推荐';
            if (append) {
                continueButton.disabled = false;
                continueButton.textContent = '继续推荐';
            }
        });
    }
}); 