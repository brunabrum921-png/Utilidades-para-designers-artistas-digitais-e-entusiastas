// Adiciona um "ouvinte de eventos" que espera todo o conteúdo HTML da página ser carregado antes de executar o código dentro dele.
// Isso garante que elementos como '.card-container' já existam quando o script tentar manipulá-los.
document.addEventListener("DOMContentLoaded", () => {
    // Seletores de elementos do DOM para reutilização
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("botao-busca");

    // Exemplo de como acessar a chave de API do arquivo config.js
    // ATENÇÃO: Chaves de API no lado do cliente (frontend) podem ser vistas por qualquer pessoa.
    // Use isso apenas para chaves que são seguras para serem expostas ou que possuem restrições
    // de uso (por exemplo, restritas ao seu domínio no painel do Google Cloud).
    if (typeof CONFIG !== 'undefined' && CONFIG.API_KEY) {
        console.log("Chave de API carregada com sucesso.");
        // Exemplo de uso:
        // const url = `https://api.exemplo.com/v1/recurso?key=${CONFIG.API_KEY}`;
    }

    // Inicia o carregamento das ferramentas
    carregarFerramentas();

    // Configura os eventos para o campo de busca e o botão
    searchInput?.addEventListener("input", debounce(aplicarFiltros, 300));
    // Adiciona um evento de clique para o botão de busca
    searchButton?.addEventListener("click", aplicarFiltros); // Adicionado 'optional chaining' por segurança

    // Configura os eventos para o botão "Voltar ao topo"
    setupBackToTopButton();

    // Configura o evento para o botão "Limpar Filtros"
    const clearFiltersButton = document.getElementById("clear-filters-btn");
    clearFiltersButton?.addEventListener("click", resetarFiltros);

    // Configura o modo escuro
    setupDarkMode();

    // Configura estilos e eventos para favoritos
    setupFavoriteListener();

    // Configura o listener para o filtro de tags
    setupTagFilterListener();

    // Configura a funcionalidade de minimizar a seção de tags
    setupTagToggle();
});

// Declara uma variável global para armazenar a lista de todas as ferramentas depois de carregadas do JSON.
let todasAsFerramentas = [];
// Declara uma variável global para armazenar o filtro de tag ativo.
let filtroTagAtivo = "Todas";
let botaoTagAtivo = null;
// Declara variáveis globais para o filtro de preço.
let filtroPrecoAtivo = "Todos";
let botaoPrecoAtivo = null;
// Declara variável para o filtro de comentários de admin.
let filtroAdminComentarioAtivo = false;
// Declara variáveis para favoritos (carrega do localStorage se existir)
let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
let filtroFavoritosAtivo = false;
// Declara variável para a ordenação.
let ordenacaoAtual = "nome";
// Declara variáveis globais para a paginação.
let paginaAtual = 1;
const cardsPorPagina = 9; // Defina quantos cards você quer por página.

// Função assíncrona (async) para buscar os dados do arquivo data.json.
async function carregarFerramentas() {
    const spinner = document.getElementById("loading-spinner");
    spinner.style.display = "flex"; // Mostra o spinner

    // O bloco 'try...catch' é usado para tratar possíveis erros durante a busca do arquivo.
    try {
        // Simula um pequeno atraso para que o spinner seja visível em conexões rápidas
        await new Promise(resolve => setTimeout(resolve, 500));
        // 'fetch' busca o arquivo. 'await' pausa a execução até que a busca seja concluída.
        const resposta = await fetch("data.json");
        // Converte a resposta em formato JSON. 'await' pausa até que a conversão termine.
        todasAsFerramentas = await resposta.json();
        // Chama a função para criar os botões de filtro de tags.
        renderizarTags();
        // Chama a função para criar os botões de filtro de preço.
        renderizarFiltroPreco();
        // Chama a função para criar as opções de ordenação.
        renderizarOpcoesOrdenacao();
        // Chama a função para criar o filtro de comentários de admin.
        renderizarFiltroAdmin();
        // Chama a função para criar o filtro de favoritos.
        renderizarFiltroFavoritos();
        // Aplica os filtros iniciais (que irá renderizar a primeira página).
        aplicarFiltros();
    } catch (error) {
        // Se ocorrer um erro no bloco 'try', ele será capturado aqui e exibido no console do navegador.
        console.error("Erro ao carregar o arquivo data.json:", error);
        document.querySelector(".card-container").innerHTML = `<p class="no-results">Não foi possível carregar as ferramentas. Tente recarregar a página.</p>`;
    } finally {
        // O bloco 'finally' sempre é executado, independentemente de sucesso ou erro.
        spinner.style.display = "none"; // Esconde o spinner
    }
}

// Função responsável por criar e exibir os cards na página.
function renderizarCards(ferramentas) {
    const cardContainer = document.querySelector(".card-container");
    const existingCards = cardContainer.querySelectorAll(".card");
    const animationDuration = 300; // Duração em ms, deve corresponder ao CSS

    const renderNewCards = () => {
        cardContainer.innerHTML = ""; // Limpa o conteúdo

        if (ferramentas.length === 0) {
            cardContainer.innerHTML = `<p class="no-results">Nenhuma ferramenta encontrada.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        let animationDelay = 0;

        for (const ferramenta of ferramentas) {
            const article = document.createElement("article");
            article.classList.add("card");
            // A opacidade inicial é 0 para a animação de fadeIn funcionar corretamente
            article.style.opacity = 0; 
            article.style.animation = `fadeIn 0.4s ease-out ${animationDelay}s forwards`;

            // Garante que tags seja um array, mesmo que venha nulo do JSON
            const tagsHtml = (ferramenta.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('');

            // Verifica se é favorito
            const isFavorite = favoritos.includes(ferramenta.nome);
            const favIcon = isFavorite ? '❤️' : '🤍';

            // Verifica se existe um comentário do admin e cria o HTML correspondente
            const adminCommentHtml = ferramenta.comentario_admin 
                ? `<div class="admin-comment"><strong>👩‍💻 Nota da Admin:</strong> ${ferramenta.comentario_admin}</div>` 
                : '';

            // URLs de compartilhamento
            const shareText = encodeURIComponent(`Confira ${ferramenta.nome}: ${ferramenta.introdução}`);
            const shareUrl = encodeURIComponent(ferramenta.link);
            const whatsappLink = `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`;
            const twitterLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;

            article.innerHTML = `
                <button class="favorite-btn" aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" data-name="${ferramenta.nome.replace(/"/g, '&quot;')}">${favIcon}</button>
                <h2>${ferramenta.nome}</h2>
                <p>${ferramenta.introdução}</p>
                <p>${ferramenta.descrição}</p>
                ${adminCommentHtml}
                <div class="card-tags">${tagsHtml}</div>
                <div class="card-actions">
                    <a href="${ferramenta.link}" target="_blank" class="btn-saiba-mais">Saiba mais</a>
                    <div class="share-buttons">
                        <a href="${whatsappLink}" target="_blank" class="share-btn whatsapp" aria-label="Compartilhar no WhatsApp" title="Compartilhar no WhatsApp">📱</a>
                        <a href="${twitterLink}" target="_blank" class="share-btn twitter" aria-label="Compartilhar no Twitter" title="Compartilhar no Twitter">🐦</a>
                    </div>
                </div>
            `;
            fragment.appendChild(article);
            animationDelay += 0.08;
        }
        cardContainer.appendChild(fragment);
    };

    // Se já existem cards, aplica a animação de fade-out primeiro
    if (existingCards.length > 0) {
        existingCards.forEach(card => card.classList.add("fade-out"));

        // Aguarda a animação de fade-out terminar para renderizar os novos cards
        setTimeout(renderNewCards, animationDuration);
    } else {
        // Se não há cards (carregamento inicial), renderiza diretamente
        renderNewCards();
    }
}

// --- LÓGICA DE FILTROS (TAGS E BUSCA) ---

// Função para criar e exibir os botões de filtro de tags.
function renderizarTags(ferramentas = todasAsFerramentas) {
    const tagContainer = document.getElementById("tag-container");
    // Adiciona uma verificação para garantir que o contêiner de tags exista antes de continuar.
    if (!tagContainer) {
        console.error("Elemento 'tag-container' não foi encontrado no DOM.");
        return;
    }

    // Extrai todas as tags de todas as ferramentas, cria um Set para obter valores únicos, e converte de volta para um array.
    const todasAsTags = [...new Set(ferramentas.flatMap(ferramenta => ferramenta.tags || []))];
    todasAsTags.sort(); // Ordena as tags em ordem alfabética.

    // Cria o botão "Todas" e o adiciona ao contêiner.
    let tagsHtml = `<button class="tag-btn ${filtroTagAtivo === 'Todas' ? 'active' : ''}" data-tag="Todas">Todas</button>`;

    // Cria um botão para cada tag única.
    tagsHtml += todasAsTags.map(tag => `<button class="tag-btn ${filtroTagAtivo === tag ? 'active' : ''}" data-tag="${tag}">${tag}">${tag}</button>`).join('');

    tagContainer.innerHTML = tagsHtml;

    // Armazena a referência inicial do botão ativo
    botaoTagAtivo = tagContainer.querySelector('.tag-btn.active');

    // Se a tag ativa não existir mais na nova lista (e não for "Todas"), reseta para "Todas"
    if (!botaoTagAtivo) {
        filtroTagAtivo = "Todas";
        const todasBtn = tagContainer.querySelector('.tag-btn[data-tag="Todas"]');
        if (todasBtn) {
            todasBtn.classList.add('active');
            botaoTagAtivo = todasBtn;
        }
    }
}

function setupTagFilterListener() {
    const tagContainer = document.getElementById("tag-container");
    if (!tagContainer) return;

    // Utiliza "event delegation": adiciona um único "ouvinte" ao contêiner pai.
    // Isso é mais eficiente e robusto do que adicionar um ouvinte para cada botão individualmente.
    tagContainer.addEventListener('click', (e) => {
        // Verifica se o elemento clicado é de fato um botão de tag.
        if (e.target.matches('.tag-btn')) {
            // Atualiza a referência do botão ativo caso tenha mudado (ex: re-renderização)
            if (!botaoTagAtivo) botaoTagAtivo = tagContainer.querySelector('.tag-btn.active');
            
            // Evita reprocessar se o botão já ativo for clicado novamente.
            if (e.target.dataset.tag === filtroTagAtivo) return;

            filtroTagAtivo = e.target.dataset.tag;
            // Remove a classe 'active' do botão antigo e a adiciona ao novo.
            botaoTagAtivo?.classList.remove('active');
            e.target.classList.add('active');
            botaoTagAtivo = e.target; // Atualiza a referência do botão ativo
            paginaAtual = 1; // Reseta para a primeira página ao mudar o filtro
            aplicarFiltros();
        }
    });
}

// Função para criar e exibir os botões de filtro de preço.
function renderizarFiltroPreco() {
    const priceContainer = document.getElementById("price-container");
    // Se o contêiner não existir no HTML, a função é encerrada para evitar erros.
    if (!priceContainer) return;

    // Extrai todos os preços únicos, usando Set para evitar duplicatas.
    const todosOsPrecos = [...new Set(todasAsFerramentas.map(ferramenta => ferramenta.preco))];
    todosOsPrecos.sort(); // Ordena os preços.

    // Cria o botão "Todos" e os botões para cada categoria de preço.
    let precoHtml = `<button class="price-btn active" data-price="Todos">Todos</button>`;
    precoHtml += todosOsPrecos.map(preco => `<button class="price-btn" data-price="${preco}">${preco}</button>`).join('');

    priceContainer.innerHTML = precoHtml;

    // Armazena a referência inicial do botão de preço ativo.
    botaoPrecoAtivo = priceContainer.querySelector('.price-btn.active');

    // Utiliza "event delegation" para o contêiner de preços, mantendo a consistência do código.
    priceContainer.addEventListener('click', (e) => {
        // Verifica se o elemento clicado é um botão de preço.
        if (e.target.matches('.price-btn')) {
            // Evita reprocessar se o botão já ativo for clicado novamente.
            if (e.target === botaoPrecoAtivo) return;

            filtroPrecoAtivo = e.target.dataset.price;
            botaoPrecoAtivo?.classList.remove('active');
            e.target.classList.add('active');
            botaoPrecoAtivo = e.target; // Atualiza a referência do botão ativo.
            renderizarTags(obterFerramentasParaTags()); // Atualiza as tags disponíveis
            paginaAtual = 1; // Reseta para a primeira página ao mudar o filtro
            aplicarFiltros();
        }
    });
}

// Função para criar e exibir as opções de ordenação.
function renderizarOpcoesOrdenacao() {
    const priceContainer = document.getElementById("price-container");
    if (!priceContainer) return;

    const sortContainer = document.createElement('div');
    sortContainer.id = 'sort-container';
    
    sortContainer.innerHTML = `
        <label for="sort-select">Ordenar por:</label>
        <select id="sort-select">
            <option value="nome">Nome (A-Z)</option>
            <option value="preco">Preço (Menor para Maior)</option>
        </select>
    `;

    // Insere logo após o container de preços
    priceContainer.parentNode.insertBefore(sortContainer, priceContainer.nextSibling);

    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
        ordenacaoAtual = e.target.value;
        aplicarFiltros();
    });
}

// Função para criar e exibir o filtro de comentários de admin.
function renderizarFiltroAdmin() {
    const priceContainer = document.getElementById("price-container"); // Reutiliza o container de preço como referência
    // Se o contêiner de preço não existir, não faz nada.
    if (!priceContainer) return;

    const adminFilterContainer = document.createElement('div');
    adminFilterContainer.id = 'admin-filter-container';
    adminFilterContainer.innerHTML = `
        <label for="admin-comment-filter">
            <input type="checkbox" id="admin-comment-filter">
            Mostrar apenas com notas da admin
        </label>
    `;
    
    // Insere o novo filtro logo após o container de filtros de preço.
    priceContainer.parentNode.insertBefore(adminFilterContainer, priceContainer.nextSibling);

    const checkbox = document.getElementById('admin-comment-filter');
    checkbox.addEventListener('change', (e) => {
        filtroAdminComentarioAtivo = e.target.checked;
        renderizarTags(obterFerramentasParaTags()); // Atualiza as tags disponíveis
        paginaAtual = 1; // Reseta para a primeira página ao mudar o filtro
        aplicarFiltros();
    });
}

// Função para criar e exibir o filtro de favoritos.
function renderizarFiltroFavoritos() {
    const priceContainer = document.getElementById("price-container");
    if (!priceContainer) return;

    const favFilterContainer = document.createElement('div');
    favFilterContainer.id = 'fav-filter-container';
    favFilterContainer.innerHTML = `
        <label for="fav-filter">
            <input type="checkbox" id="fav-filter">
            Ver apenas Favoritos ❤️
        </label>
    `;
    
    priceContainer.parentNode.insertBefore(favFilterContainer, priceContainer.nextSibling);

    document.getElementById('fav-filter').addEventListener('change', (e) => {
        filtroFavoritosAtivo = e.target.checked;
        paginaAtual = 1;
        aplicarFiltros();
    });
}

// Função auxiliar para obter ferramentas filtradas apenas por preço e admin (para atualizar tags)
function obterFerramentasParaTags() {
    let ferramentas = todasAsFerramentas;
    if (filtroPrecoAtivo !== "Todos") {
        ferramentas = ferramentas.filter(f => f.preco === filtroPrecoAtivo);
    }
    if (filtroAdminComentarioAtivo) {
        ferramentas = ferramentas.filter(f => f.comentario_admin && f.comentario_admin.trim() !== '');
    }
    if (filtroFavoritosAtivo) {
        ferramentas = ferramentas.filter(f => favoritos.includes(f.nome));
    }
    return ferramentas;
}

// Função central que aplica tanto o filtro de tag quanto o de busca.
function aplicarFiltros() {
    // Pega o texto digitado, remove espaços em branco no início/fim e converte para minúsculas.
    // Ao buscar, também resetamos a página para a primeira.
    const termoBusca = document.getElementById("search-input").value.trim().toLowerCase();
 
    // 1. Começa com as ferramentas já filtradas por preço e comentário de admin.
    let ferramentasFiltradas = obterFerramentasParaTags();
 
    // 2. Em seguida, filtra pela tag ativa (se não for "Todas")
    if (filtroTagAtivo !== "Todas") {
        ferramentasFiltradas = ferramentasFiltradas.filter(ferramenta =>
            (ferramenta.tags || []).includes(filtroTagAtivo)
        );
    }

    // 3. Filtra por favoritos
    if (filtroFavoritosAtivo) {
        ferramentasFiltradas = ferramentasFiltradas.filter(ferramenta => favoritos.includes(ferramenta.nome));
    }
 
    // 4. Por fim, filtra por termo de busca (se houver algum)
    if (termoBusca) {
        ferramentasFiltradas = ferramentasFiltradas.filter(ferramenta =>
            (
                ferramenta.nome.toLowerCase().includes(termoBusca) ||
                ferramenta.introdução.toLowerCase().includes(termoBusca) ||
                ferramenta.descrição.toLowerCase().includes(termoBusca) ||
                (ferramenta.tags || []).some(tag => tag.toLowerCase().includes(termoBusca)) // Também busca nas tags
            )
        );
    }

    // --- LÓGICA DE ORDENAÇÃO ---
    ferramentasFiltradas.sort((a, b) => {
        if (ordenacaoAtual === 'nome') {
            return a.nome.localeCompare(b.nome);
        } else if (ordenacaoAtual === 'preco') {
            const pesos = { "Gratuito": 0, "Freemium": 1, "Pago": 2, "Assinatura": 3 };
            const pesoA = pesos[a.preco] ?? 99;
            const pesoB = pesos[b.preco] ?? 99;
            // Se o preço for igual, desempata pelo nome
            if (pesoA === pesoB) return a.nome.localeCompare(b.nome);
            return pesoA - pesoB;
        }
        return 0;
    });

    // --- LÓGICA DE PAGINAÇÃO ---
    // Calcula o índice do primeiro e do último card da página atual.
    const indiceInicial = (paginaAtual - 1) * cardsPorPagina;
    const indiceFinal = paginaAtual * cardsPorPagina;
    // Pega apenas a "fatia" de cards para a página atual.
    const cardsDaPagina = ferramentasFiltradas.slice(indiceInicial, indiceFinal);

    // Renderiza os cards da página atual.
    renderizarCards(cardsDaPagina);
    // Renderiza os controles da paginação.
    renderizarPaginacao(ferramentasFiltradas.length);

    // Mostra ou esconde o botão de limpar filtros
    const clearFiltersButton = document.getElementById("clear-filters-btn");
    const isAnyFilterActive = termoBusca !== "" || filtroTagAtivo !== "Todas" || filtroPrecoAtivo !== "Todos" || filtroAdminComentarioAtivo || filtroFavoritosAtivo;
    clearFiltersButton.style.display = isAnyFilterActive ? "inline-block" : "none";
};

// --- LÓGICA PARA O BOTÃO "VOLTAR AO TOPO" ---

function setupBackToTopButton() {
    // Seleciona o botão no documento HTML pelo seu ID.
    const backToTopButton = document.getElementById("back-to-top-btn");
    if (!backToTopButton) return;

    // Função que decide se o botão deve ser mostrado ou escondido.
    const scrollFunction = () => {
        // Se a rolagem vertical for maior que 300 pixels...
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            backToTopButton.style.display = "block"; // ...mostra o botão.
        } else {
            backToTopButton.style.display = "none"; // ...senão, esconde o botão.
        }
    };

    // Adiciona um "ouvinte de eventos" que observa a rolagem da janela.
    window.addEventListener("scroll", scrollFunction);

    // Adiciona um "ouvinte de eventos" para o clique no botão.
    backToTopButton.addEventListener("click", () => {
        // Rola a página para o topo (posição 0) com uma animação suave.
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- LÓGICA DA PAGINAÇÃO ---

function renderizarPaginacao(totalDeCards) {
    const paginationContainer = document.getElementById("pagination-container");
    if (!paginationContainer) return;

    const totalDePaginas = Math.ceil(totalDeCards / cardsPorPagina);
    paginationContainer.innerHTML = ""; // Limpa a paginação anterior

    // Não mostra a paginação se houver apenas uma página ou nenhuma.
    if (totalDePaginas <= 1) {
        return;
    }

    for (let i = 1; i <= totalDePaginas; i++) {
        const button = document.createElement("button");
        button.innerText = i;
        button.addEventListener("click", () => {
            paginaAtual = i;
            aplicarFiltros();
            // Rola a tela para o topo do container de cards
            document.querySelector(".card-container").scrollIntoView({ behavior: "smooth" });
        });

        if (i === paginaAtual) {
            button.classList.add("active");
        }
        paginationContainer.appendChild(button);
    }
}

// --- LÓGICA PARA LIMPAR FILTROS ---

function resetarFiltros() {
    // 1. Reseta as variáveis de estado
    filtroTagAtivo = "Todas";
    filtroPrecoAtivo = "Todos";
    filtroAdminComentarioAtivo = false;
    filtroFavoritosAtivo = false;
    ordenacaoAtual = "nome";
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = "nome";

    paginaAtual = 1;

    // 2. Limpa o campo de busca
    document.getElementById("search-input").value = "";

    // 3. Reseta o checkbox de filtro de admin
    const adminCheckbox = document.getElementById('admin-comment-filter');
    if (adminCheckbox) adminCheckbox.checked = false;

    // 4. Reseta os botões de filtro de preço para "Todos"
    botaoPrecoAtivo?.classList.remove('active');
    const todosPrecosBtn = document.querySelector('.price-btn[data-price="Todos"]');
    todosPrecosBtn?.classList.add('active');
    botaoPrecoAtivo = todosPrecosBtn;

    // 5. Reseta os botões de filtro de tag para "Todas"
    renderizarTags(todasAsFerramentas);

    // 6. Aplica os filtros para re-renderizar a lista completa
    aplicarFiltros();
}

// --- LÓGICA DO MODO ESCURO ---

function setupDarkMode() {
    // Cria o botão de alternância se ele não existir
    let toggleBtn = document.getElementById('dark-mode-toggle');
    
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'dark-mode-toggle';
        toggleBtn.className = 'dark-mode-toggle';
        toggleBtn.setAttribute('aria-label', 'Alternar Modo Escuro');
        // Adiciona ao corpo do documento
        document.body.appendChild(toggleBtn);
    }

    // Função para atualizar o ícone e o estado
    const updateThemeUI = (isDark) => {
        toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    };

    // Verifica preferência salva ou do sistema
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    updateThemeUI(isDark);

    // Evento de clique
    toggleBtn.addEventListener('click', () => {
        isDark = !document.body.classList.contains('dark-mode');
        updateThemeUI(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// --- LÓGICA DE FAVORITOS ---

function setupFavoriteListener() {
    // Usa delegação de eventos no container principal
    const container = document.querySelector('.card-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
        // Verifica se clicou no botão ou no ícone dentro dele
        const btn = e.target.closest('.favorite-btn');
        if (btn) {
            e.preventDefault(); // Evita comportamento padrão se estiver dentro de um link
            e.stopPropagation(); // Evita propagação do clique
            const nome = btn.dataset.name;
            toggleFavorito(nome);
        }
    });
}

function toggleFavorito(nome) {
    if (favoritos.includes(nome)) {
        favoritos = favoritos.filter(f => f !== nome);
    } else {
        favoritos.push(nome);
    }
    // Salva no localStorage
    localStorage.setItem('favoritos', JSON.stringify(favoritos));

    // Se estiver filtrando por favoritos, precisa recarregar a lista para remover o item
    if (filtroFavoritosAtivo) {
        aplicarFiltros();
    } else {
        // Se não, apenas atualiza o ícone visualmente
        const btn = document.querySelector(`.favorite-btn[data-name="${nome.replace(/"/g, '\\"')}"]`);
        if (btn) {
            const isFav = favoritos.includes(nome);
            btn.innerHTML = isFav ? '❤️' : '🤍';
            btn.setAttribute('aria-label', isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        }
    }
}

function setupTagToggle() {
    const tagContainer = document.getElementById("tag-container");
    if (!tagContainer) return;

    // Cria o botão de alternância
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'tags-toggle-btn';
    toggleBtn.className = 'tags-toggle-btn';
    toggleBtn.innerHTML = 'Filtrar por Tags <span class="toggle-icon">▼</span>';
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-controls', 'tag-container');
    
    // Insere antes do container de tags
    tagContainer.parentNode.insertBefore(toggleBtn, tagContainer);

    // Evento de clique
    toggleBtn.addEventListener('click', () => {
        const isCollapsed = tagContainer.classList.contains('collapsed');
        
        if (isCollapsed) {
            tagContainer.classList.remove('collapsed');
            toggleBtn.classList.remove('collapsed');
            toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
            tagContainer.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// --- FUNÇÕES UTILITÁRIAS ---

// Função de Debounce para melhorar a performance da busca
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}