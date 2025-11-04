console.log('Script loaded!');

// Система аутентификации
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Пагинация
let currentPage = 1;
let productsPerPage = 40;
let allProducts = [];
let filteredProducts = null;

let currentFilter = null;

function initLazyLoad() {
    const lazyImages = document.querySelectorAll('img.lazy-image');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Фолбэк для старых браузеров - грузим все сразу
        lazyImages.forEach(img => loadImage(img));
    }
}

function loadImage(img) {
    img.src = img.dataset.src;
    img.onload = function() {
        img.classList.remove('lazy-image');
        img.classList.add('loaded');
    };
}

// Проверяем токен при загрузке
if (authToken) {
    verifyToken(authToken);
}

document.addEventListener('DOMContentLoaded', function(){
    // Обработчики для системы входа
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }

    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        const loginCloseBtn = loginModal.querySelector('.close');
        if (loginCloseBtn) {
            loginCloseBtn.onclick = function() {
                loginModal.style.display = 'none';
            }
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Закрытие модалки логина по клику снаружи
        loginModal.addEventListener('click', function(event) {
            if (event.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });
    }

    // Обработчики для модального окна продукта
    const productModal = document.getElementById('product-form-modal');
    if (productModal) {
        const productCloseBtn = productModal.querySelector('.close');
        const productCancelBtn = document.getElementById('product-cancel-btn');

        if (productCloseBtn) {
            productCloseBtn.onclick = function() {
                productModal.style.display = 'none';
            };
        }

        if (productCancelBtn) {
            productCancelBtn.onclick = function() {
                productModal.style.display = 'none';
            };
        }

        productModal.addEventListener('click', function(event) {
            if (event.target === productModal) {
                productModal.style.display = 'none';
            }
        });

        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', handleProductSubmit);
        }
    }

    // Инициализация кнопки добавления продукта
    initAddProductButton();

    // Загрузка данных
    loadAllData();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', showAllProducts);
    }

    const search = document.querySelector('form[action="/api/search"]')
    if (search) {
        search.addEventListener('submit', function (e) {
            e.preventDefault();
            productSearch();
        })
    }

    // Инициализация пагинации
    initPagination();

    // Обработчик для мобильного меню
    const menuItems = document.querySelectorAll('.menu > li');

    function isMobile() {
        return window.innerWidth <= 360;
    }

    function toggleSubmenu(event) {
        if (!isMobile()) return;

        const li = this;
        const submenu = li.querySelector('ul');

        if (submenu) {
            event.preventDefault();

            // Закрываем все остальные подменю
            menuItems.forEach(item => {
                if (item !== li) {
                    const otherSubmenu = item.querySelector('ul');
                    if (otherSubmenu) {
                        otherSubmenu.style.display = 'none';
                    }
                }
            });

            // Переключаем текущее подменю
            if (submenu.style.display === 'block') {
                submenu.style.display = 'none';
            } else {
                submenu.style.display = 'block';
            }
        }
    }

    const inStockLink = document.querySelector('.in-stock');
    if (inStockLink) {
        inStockLink.addEventListener('click', function(e) {
            e.preventDefault();
            filterInStockProducts();
        });
    }

    menuItems.forEach(item => {
        item.addEventListener('click', toggleSubmenu);
    });

    // Обработчик изменения размера окна
    window.addEventListener('resize', function() {
        if (!isMobile()) {
            // На десктопе возвращаем стандартное поведение
            menuItems.forEach(item => {
                const submenu = item.querySelector('ul');
                if (submenu) {
                    submenu.style.display = '';
                }
            });
        }
    });
})

// Функции пагинации
function initPagination() {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.innerHTML = `
        <button id="prev-page" class="pagination-btn">← Назад</button>
        <span id="page-info">Страница 1</span>
        <button id="next-page" class="pagination-btn">Вперед →</button>
        <select id="page-size">
            <option value="20">20 на странице</option>
            <option value="40" selected>40 на странице</option>
            <option value="100">100 на странице</option>
        </select>
    `;

    const productsContainer = document.querySelector('.products-container');
    if (productsContainer) {
        productsContainer.parentNode.insertBefore(paginationContainer, productsContainer.nextSibling);

        // Обработчики пагинации
        document.getElementById('prev-page').addEventListener('click', goToPrevPage);
        document.getElementById('next-page').addEventListener('click', goToNextPage);
        document.getElementById('page-size').addEventListener('change', changePageSize);
    }
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
    }
}

function goToNextPage() {
    const totalPages = getTotalPages();
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
    }
}

function changePageSize(e) {
    productsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderCurrentPage();
}

function getTotalPages() {
    const productsToShow = filteredProducts || allProducts;
    return Math.ceil(productsToShow.length / productsPerPage);
}

function getCurrentPageProducts() {
    const productsToShow = filteredProducts || allProducts;
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return productsToShow.slice(startIndex, endIndex);
}

function updatePaginationInfo() {
    const pageInfo = document.getElementById('page-info');
    const totalPages = getTotalPages();
    const productsToShow = filteredProducts || allProducts;

    if (pageInfo) {
        pageInfo.textContent = `Страница ${currentPage} из ${totalPages} (всего: ${productsToShow.length})`;
    }

    // Блокируем/разблокируем кнопки
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function renderCurrentPage() {
    const currentProducts = getCurrentPageProducts();
    renderProducts(currentProducts);
    updatePaginationInfo();
}

// Функции аутентификации
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: username,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            // Сохраняем токен и информацию о пользователе
            authToken = data.token;
            currentUser = data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Закрываем модалку и обновляем интерфейс
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            updateUIForAdmin();

            console.log('Успешный вход!');
        } else {
            showNotification('Ошибка входа: ' + (data.message || 'Неверные данные'), 'error');
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

async function verifyToken(token) {
    try {
        const response = await fetch('/api/verify-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            updateUIForAdmin();
        } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }
}

function updateUIForAdmin() {
    // Показываем кнопку добавления продукта
    const addProductBtn = document.getElementById('add-product-btn');
    if (!addProductBtn) {
        createAddProductButton();
    } else {
        addProductBtn.style.display = 'block';
        addProductBtn.addEventListener('click', showAddProductModal);
    }

    updateProductsWithAdminControls();

    // Меняем кнопку входа на кнопку выхода
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Выйти';
        loginBtn.removeEventListener('click', showLoginModal);
        loginBtn.addEventListener('click', handleLogout);
    }
}

function createAddProductButton() {
    const addBtn = document.createElement('button');
    addBtn.id = 'add-product-btn';
    addBtn.textContent = '+ Добавить продукт';
    addBtn.className = 'add-product-btn';

    const productsContainer = document.querySelector('.products-container');
    if (productsContainer) {
        productsContainer.parentNode.insertBefore(addBtn, productsContainer);
        addBtn.addEventListener('click', showAddProductModal);
    }
}

function initAddProductButton() {
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddProductModal);
    }
}

function updateProductsWithAdminControls() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        if (!card.querySelector('.admin-controls')) {
            const adminControls = document.createElement('div');
            adminControls.className = 'admin-controls';
            adminControls.innerHTML = `
                <button class="edit-btn" title="Редактировать">✏️</button>
                <button class="delete-btn" title="Удалить">🗑️</button>
            `;
            card.appendChild(adminControls);

            const editBtn = adminControls.querySelector('.edit-btn');
            const deleteBtn = adminControls.querySelector('.delete-btn');

            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = card.dataset.productId;
                showEditProductModal(productId);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = card.dataset.productId;
                deleteProduct(productId);
            });
        }
    });
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Вход для админа';
        loginBtn.removeEventListener('click', handleLogout);
        loginBtn.addEventListener('click', showLoginModal);
    }

    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.style.display = 'none';
    }

    const adminControls = document.querySelectorAll('.admin-controls');
    adminControls.forEach(control => control.remove());

    console.log('Выход выполнен');
}

function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

let currentEditingProductId = null;

// Функции для работы с продуктами
function showAddProductModal() {
    currentEditingProductId = null;
    const title = document.getElementById('product-form-title');
    const submitBtn = document.getElementById('product-submit-btn');
    const form = document.getElementById('product-form');

    if (title) title.textContent = 'Добавить продукт';
    if (submitBtn) submitBtn.textContent = 'Добавить продукт';
    if (form) form.reset();

    fillBrandsAndCategories();

    const modal = document.getElementById('product-form-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function showEditProductModal(productId) {
    currentEditingProductId = productId;

    console.log('Searching for product ID:', productId, 'Type:', typeof productId);
    console.log('All products:', allProducts);

    const product = allProducts.find(p => {
        const productIdNum = parseInt(productId);
        const pIdNum = parseInt(p.id);
        return pIdNum === productIdNum;
    });

    if (!product) {
        console.error('Product not found. Available IDs:', allProducts.map(p => p.id));
        showNotification('Продукт не найден в загруженных данных', 'error');
        return;
    }

    const title = document.getElementById('product-form-title');
    const submitBtn = document.getElementById('product-submit-btn');

    if (title) title.textContent = 'Редактировать продукт';
    if (submitBtn) submitBtn.textContent = 'Сохранить изменения';

    const modal = document.getElementById('product-form-modal');
    if (modal) {
        modal.style.display = 'block';
        console.log('Edit modal opened for product:', product);
    }

    fillProductForm(product);

    try {
        await fillBrandsAndCategories();
    } catch (error) {
        console.error('Ошибка загрузки брендов/категорий:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

function fillProductForm(product) {
    console.log('Filling form with product:', product);

    const nameInput = document.getElementById('product-name');
    const altNameInput = document.getElementById('product-alt-name');
    const descInput = document.getElementById('product-description');
    const tagsInput = document.getElementById('product-tags');
    const stockInput = document.getElementById('product-in-stock');

    if (nameInput) nameInput.value = product.name || '';
    if (altNameInput) altNameInput.value = product.alt_name || '';
    if (descInput) descInput.value = product.description || '';

    if (tagsInput) {
        if (Array.isArray(product.tags)) {
            tagsInput.value = product.tags.join(', ');
        } else {
            tagsInput.value = product.tags || '';
        }
    }

    if (stockInput) stockInput.checked = product.in_stock !== false;

    setTimeout(() => {
        const brandSelect = document.getElementById('product-brand');
        const categorySelect = document.getElementById('product-category');

        if (brandSelect && product.brand) brandSelect.value = product.brand;
        if (categorySelect && product.category) categorySelect.value = product.category;
    }, 100);
}

async function fillBrandsAndCategories() {
    try {
        const brandSelect = document.getElementById('product-brand');
        const categorySelect = document.getElementById('product-category');

        if (brandSelect && brandSelect.options.length <= 1) {
            const brandsResponse = await fetch('/api/brands');
            const brandsData = await brandsResponse.json();
            const brands = brandsData.brandList || brandsData;

            if (Array.isArray(brands)) {
                brands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand;
                    option.textContent = brand;
                    brandSelect.appendChild(option);
                });
            }
        }

        if (categorySelect && categorySelect.options.length <= 1) {
            const categoriesResponse = await fetch('/api/category');
            const categoriesData = await categoriesResponse.json();
            const categories = categoriesData.categoryList || categoriesData;

            if (Array.isArray(categories)) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки брендов/категорий:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const productData = {
        name: formData.get('name'),
        alt_name: formData.get('alt_name'),
        description: formData.get('description'),
        brand: formData.get('brand'),
        category: formData.get('category'),
        in_stock: formData.get('in_stock') === 'on',
        tags: formData.get('tags') ?
            formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag !== '')
            : []
    };

    console.log('Submitting product data:', productData);

    try {
        if (currentEditingProductId) {
            await updateProduct(currentEditingProductId, productData);
            showNotification('✅ Продукт успешно обновлен!', 'success');
        } else {
            await addProduct(productData);
            showNotification('✅ Продукт успешно добавлен!', 'success');
        }

        closeProductModal();
        refreshProducts();

    } catch (error) {
        console.error('Ошибка сохранения продукта:', error);
        showNotification(error.message, 'error');
    }
}

async function addProduct(productData) {
    const response = await fetch('/api/products/add', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData)
    });

    const responseText = await response.text();

    if (!response.ok) {
        if (response.status === 500 && responseText.includes('Error')) {
            throw new Error('❌ Продукт с таким названием уже существует! Выберите другое название.');
        }

        throw new Error(`Ошибка сервера: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        return { status: 'success' };
    }
}

async function updateProduct(productId, productData) {
    const response = await fetch(`/api/products/${productId}/edit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData)
    });

    const responseText = await response.text();

    if (!response.ok) {
        // Проверяем, это ошибка дубликата названия?
        if (response.status === 500 && responseText.includes('Error')) {
            throw new Error('❌ Продукт с таким названием уже существует! Выберите другое название.');
        }

        // Для других ошибок
        throw new Error(`Ошибка сервера: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        return { status: 'success' };
    }
}

async function deleteProduct(productId) {
    if (!confirm('Вы уверены, что хотите удалить этот продукт?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}/delete`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const index = allProducts.findIndex(p => p.id === productId);
            if (index !== -1) {
                allProducts.splice(index, 1);
            }
            renderCurrentPage();
            console.log('Продукт удален');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка удаления продукта');
        }

    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        showNotification('Ошибка удаления продукта: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    const notificationIcon = document.getElementById('notification-icon');

    if (!notification || !notificationText || !notificationIcon) return;

    notificationText.textContent = message;
    notificationIcon.textContent = type === 'success' ? '✓' : '!';
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        hideNotification();
    }, 4000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.add('hidden');
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-form-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Загрузка данных
async function loadAllData() {
    try {
        const [productsResponse, brandsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/brands'),
            fetch('/api/category')
        ]);

        const productsData = await productsResponse.json();
        const brandsData = await brandsResponse.json();
        const categoriesData = await categoriesResponse.json();

        // Загружаем продукты
        const products = productsData.productList || productsData;
        loadProducts(products);

        // Загружаем бренды и категории
        loadBrands(brandsData.brandList || brandsData);
        loadCategories(categoriesData.categoryList || categoriesData);

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

function refreshProducts() {
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            const products = data.productList || data;
            loadProducts(products);
        })
        .catch(error => {
            console.error('Ошибка обновления продуктов:', error);
        });
}

function loadProducts(products) {
    if (Array.isArray(products)) {
        allProducts = products;
        filteredProducts = null;
        currentPage = 1;
        renderCurrentPage();
    } else {
        console.error('Продукты не являются массивом:', products);
    }
}

function renderProducts(products) {
    const container = document.querySelector('.products-container');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #707B6D;">По вашему запросу ничего не найдено</p>';
        return;
    }

    products.forEach(product => {
        const imagePath = getProductImagePath(product.image_url, 'small');

        const div = document.createElement('div');
        div.className = "product-card";
        div.dataset.productId = product.id;

        div.innerHTML = `
            <div class="product-image-container">
                <img data-src="${imagePath}" alt="${product.name}" class="lazy-image">
                ${product.in_stock ? '<div class="stock-badge in-stock">✓ В наличии</div>' : '<div class="stock-badge out-of-stock hidden">Нет в наличии</div>'}
            </div>
            <h3>${product.brand}</h3>
            <p>${product.name}</p>
        `;

        div.addEventListener('click', function() {
            showProductDetails(product);
        });

        container.appendChild(div);
    });

    initLazyLoad();

    if (currentUser) {
        updateProductsWithAdminControls();
    }
}

function showProductDetails(product) {
    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = modal ? modal.querySelector('.close') : null;

    if (!modal || !modalBody) return;

    const modalImagePath = getProductImagePath(product.image_url, 'medium');

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${product.name}</h2>
        </div>
        <img class="modal-image" src="${modalImagePath}" alt="${product.name}" style="width: 70%">
        <p><strong>Бренд:</strong> <a class="modal-link-brand" href=#>${product.brand}</a></p>
        <p><strong>Категория:</strong> <a class="modal-link-category" href=#>${product.category}</a></p>
        <div class="product-description">
            <strong>Описание:</strong><br>
            ${product.description}
        </div>
        <div class="tags">
        <strong>Теги:</strong> 
        ${product.tags ? product.tags.map(tag => `<span class="tag"><a href=#>${tag}</a></span>`).join(' ') : '-'}
    </div>
    `;

    modal.style.display = 'block';

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }

    modal.addEventListener('click', function (event){
        if (event.target === event.currentTarget) {
            modal.style.display = 'none';
        }
    });

    const brandLink = modalBody.querySelector('.modal-link-brand');
    if (brandLink) {
        brandLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const brandText = this.textContent;
            filterProductsByBrand(brandText);
            modal.style.display = 'none';
        });
    }

    const categoryLink = modalBody.querySelector('.modal-link-category');
    if (categoryLink) {
        categoryLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const categoryText = this.textContent;
            filterProductsByCategory(categoryText);
            modal.style.display = 'none';
        });
    }

    const tagLinks = modalBody.querySelectorAll('.tag a');
    tagLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const tagText = this.textContent;
            filterProductsByTags(tagText);
            modal.style.display = 'none';
        });
    });
}

function getProductImagePath(basePath, size = 'small') {
    // Проверяем поддержку WebP
    const supportsWebP = document.createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0;

    const formats = supportsWebP ?
        { small: 'webp', medium: 'webp'} :
        { small: 'png', medium: 'png'};

    const sizes = {
        small: '_300x300',
        medium: '_600x600'
    };

    return `${basePath}${sizes[size]}.${formats[size]}`;
}

// закрытие по Escape
document.addEventListener('keydown', function (event){
    if (event.key === "Escape") {
        const modal = document.getElementById('product-modal');
        if (modal && modal.style.display === "block") {
            modal.style.display = 'none';
        }

        const loginModal = document.getElementById('login-modal');
        if (loginModal && loginModal.style.display === "block") {
            loginModal.style.display = 'none';
        }

        const productFormModal = document.getElementById('product-form-modal');
        if (productFormModal && productFormModal.style.display === "block") {
            productFormModal.style.display = 'none';
        }
    }
})

function loadBrands(brands) {
    const brandsList = document.querySelector('.brands');
    if (!brandsList || !Array.isArray(brands)) return;

    brands.forEach(brand => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = brand;

        a.addEventListener('click', function(e) {
            e.preventDefault();
            filterProductsByBrand(brand);
        });

        li.appendChild(a);
        brandsList.appendChild(li);
    });
}

function loadCategories(categories) {
    const categoryList = document.querySelector('.category');
    if (!categoryList || !Array.isArray(categories)) return;

    categories.forEach(category => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = category;

        a.addEventListener('click', function(e) {
            e.preventDefault();
            filterProductsByCategory(category);
        });

        li.appendChild(a);
        categoryList.appendChild(li);
    });
}

function filterProductsByBrand(brand) {
    if (!Array.isArray(allProducts)) return;

    filteredProducts = allProducts.filter(product =>
        product.brand && product.brand.toLowerCase() === brand.toLowerCase()
    );

    currentPage = 1;
    renderCurrentPage();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.style.display = "block";
    }
}

function filterProductsByCategory(category) {
    if (!Array.isArray(allProducts)) return;

    filteredProducts = allProducts.filter(product =>
        product.category && product.category.toLowerCase() === category.toLowerCase()
    );

    currentPage = 1;
    renderCurrentPage();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.style.display = "block";
    }
}

function filterProductsByTags(tag) {
    if (!Array.isArray(allProducts)) return;

    filteredProducts = allProducts.filter(product =>
            product.tags && product.tags.some(t =>
                t.toLowerCase() === tag.toLowerCase()
            )
    );

    currentPage = 1;
    renderCurrentPage();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.style.display = "block";
    }
}

function showAllProducts() {
    filteredProducts = null;
    currentPage = 1;
    currentFilter = null;

    renderCurrentPage();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.style.display = "none";
    }

    const searchInput = document.getElementById('site-search');
    if (searchInput) {
        searchInput.value = '';
    }
}

function productSearch() {
    const input = document.getElementById('site-search');
    if (!input) return;

    const val = input.value.trim();
    console.log('Поиск по ', val);

    if (val.length === 0) {
        showAllProducts();
        return;
    }

    fetch(`/api/search?q=${encodeURIComponent(val)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            filteredProducts = data.productList || [];
            currentPage = 1;
            renderCurrentPage();

            const resetBtn = document.getElementById('reset-filter');
            if (resetBtn) {
                resetBtn.style.display = "block";
            }
        })
        .catch(error => {
            console.error('Ошибка поиска:', error);
            renderProducts([]);
        });
}

function filterInStockProducts() {
    if (currentFilter === 'in_stock') {
        showAllProducts();
        currentFilter = null;
        return;
    }

    filteredProducts = allProducts.filter(product => product.in_stock === true);

    currentPage = 1;
    currentFilter = 'in_stock';
    renderCurrentPage();

    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.style.display = "block";
    }
}
