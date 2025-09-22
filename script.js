const API_URL = "https://66d39f5c184dce1713d09736.mockapi.io/Api/v1/clientes";
const PANELS_API_URL = "https://66d39f5c184dce1713d09736.mockapi.io/Api/v1/paineis";
let clients = [];
let editingIndex = null;
let openDetail = null;
let isSaving = false;

const DEFAULT_DUE_MESSAGE = `Olá {cliente}, tudo bem? 😊\n\n🚨 Para evitar qualquer interrupção no seu acesso, *lembramos que seu plano vence em {vencimento} às 23:59.*\n\n📅 Faça o pagamento de R$ {valor} via Pix para o número 11915370708.\n\n💳 Após o pagamento, envie o comprovante e continue aproveitando sem preocupações!\n\nAgradecemos pela confiança! 💙`;
const DEFAULT_RENEWAL_MESSAGE = `Olá {cliente}!\n\n✅ Seu plano foi renovado com sucesso!\n\n📅 *Próximo vencimento: {vencimento}.*\n\n💳 Qualquer dúvida, é só chamar!`;

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar funcionalidades
    loadClients();
    setupFilters();
    fetchPanels();
    loadTheme();
    updateThemeIcon();
    loadWhatsAppMessages();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupWhatsAppMessagesForm();

    // Garantir que as abas iniciem minimizadas
    document.querySelectorAll('.group-content').forEach(group => {
        group.classList.remove('open');
    });
    document.querySelectorAll('.group-header i').forEach(icon => {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    });

    // Adicionar eventos para botões
    const newClientBtn = document.getElementById('new-client-btn');
    const panelManagerBtn = document.getElementById('panel-manager-btn');
    const whatsappMessagesBtn = document.getElementById('whatsapp-messages-btn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const vencidosHeader = document.querySelector('.group-header.vencidos');
    const vencendoHeader = document.querySelector('.group-header.vencendo');
    const emDiaHeader = document.querySelector('.group-header.em-dia');

    if (newClientBtn) {
        newClientBtn.addEventListener('click', () => openModal());
    } else {
        console.error("Elemento com ID 'new-client-btn' não encontrado.");
    }

    if (panelManagerBtn) {
        panelManagerBtn.addEventListener('click', openPanelManager);
    } else {
        console.error("Elemento com ID 'panel-manager-btn' não encontrado.");
    }

    if (whatsappMessagesBtn) {
        whatsappMessagesBtn.addEventListener('click', openWhatsAppMessagesModal);
    } else {
        console.error("Elemento com ID 'whatsapp-messages-btn' não encontrado.");
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    } else {
        console.error("Elemento com ID 'themeToggleBtn' não encontrado.");
    }

    if (vencidosHeader) {
        vencidosHeader.addEventListener('click', () => toggleGroup('vencidos'));
    } else {
        console.error("Cabeçalho 'vencidos' não encontrado.");
    }

    if (vencendoHeader) {
        vencendoHeader.addEventListener('click', () => toggleGroup('vencendo'));
    } else {
        console.error("Cabeçalho 'vencendo' não encontrado.");
    }

    if (emDiaHeader) {
        emDiaHeader.addEventListener('click', () => toggleGroup('em-dia'));
    } else {
        console.error("Cabeçalho 'em-dia' não encontrado.");
    }
});

function updateDateTime() {
    const now = new Date();
    const formattedDateTime = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
    const currentDateTime = document.getElementById('currentDateTime');
    if (currentDateTime) {
        currentDateTime.textContent = formattedDateTime;
    }
}

async function loadClients() {
    const clientTable = document.getElementById("clientTable");
    if (!clientTable) {
        console.error("Elemento com ID 'clientTable' não encontrado.");
        return;
    }
    clientTable.querySelectorAll(".group-content").forEach(group => {
        group.innerHTML = '<div style="padding: 12px 16px"><div class="loader"></div></div>';
        group.classList.remove('open');
    });
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        clients = await response.json();
        clients.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
        await renderClients(clients);
    } catch (e) {
        console.error("Erro ao carregar os clientes:", e);
        clientTable.querySelectorAll(".group-content").forEach(group => {
            group.innerHTML = '<div style="padding: 16px">Erro ao carregar os dados.</div>';
        });
        showToast("Erro ao carregar os clientes.", "error");
    }
}

async function renderClients(clients) {
    const paineis = await fetchPanels();
    const vencidosGroup = document.getElementById("vencidos-group");
    const vencendoGroup = document.getElementById("vencendo-group");
    const emDiaGroup = document.getElementById("em-dia-group");
    const todosContent = document.getElementById("todos-content");

    if (!vencidosGroup || !vencendoGroup || !emDiaGroup || !todosContent) {
        console.error("Um ou mais elementos de grupo não foram encontrados.");
        return;
    }

    vencidosGroup.innerHTML = "";
    vencendoGroup.innerHTML = "";
    emDiaGroup.innerHTML = "";
    todosContent.innerHTML = "";

    const now = new Date();
    const vencidos = [];
    const vencendo = [];
    const emDia = [];

    clients.forEach(client => {
        const dueDate = new Date(client.vencimento);
        const daysDiff = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
            vencidos.push(client);
        } else if (daysDiff <= 3) {
            vencendo.push(client);
        } else {
            emDia.push(client);
        }
    });

    const calculateGroupTotal = (groupClients, paineis) => {
        return groupClients.reduce((sum, client) => {
            const foundPanel = paineis.find(p => p.id === client.painel) || { valorCredito: 0 };
            const valorPlano = parseFloat(client.valor) || 0;
            const valorCredito = parseFloat(foundPanel.valorCredito) || 0;
            return sum + (valorPlano - valorCredito);
        }, 0).toFixed(2);
    };

    const vencidosCount = document.getElementById("vencidos-count");
    const vencendoCount = document.getElementById("vencendo-count");
    const emDiaCount = document.getElementById("em-dia-count");
    const vencidosTotal = document.getElementById("vencidos-total");
    const vencendoTotal = document.getElementById("vencendo-total");
    const emDiaTotal = document.getElementById("em-dia-total");

    if (vencidosCount) vencidosCount.textContent = vencidos.length;
    if (vencendoCount) vencendoCount.textContent = vencendo.length;
    if (emDiaCount) emDiaCount.textContent = emDia.length;
    if (vencidosTotal) vencidosTotal.textContent = `R$ ${calculateGroupTotal(vencidos, paineis)}`;
    if (vencendoTotal) vencendoTotal.textContent = `R$ ${calculateGroupTotal(vencendo, paineis)}`;
    if (emDiaTotal) emDiaTotal.textContent = `R$ ${calculateGroupTotal(emDia, paineis)}`;

    const renderClient = (client, isSearch = false) => {
        const dueDate = new Date(client.vencimento);
        const daysDiff = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
        const formattedDate = formatDate(client.vencimento);
        const dueMessage = getWhatsAppMessage("due", client);
        const foundPanel = paineis.find(p => p.id === client.painel) || { nome: 'Painel não encontrado', link: '#' };
        const actionButtons = daysDiff <= 3 ? `
            <a href="https://wa.me/55${client.whats}?text=${encodeURIComponent(dueMessage)}" target="_blank" class="whatsapp-btn" aria-label="Enviar lembrete de vencimento via WhatsApp"><i class="fab fa-whatsapp"></i></a>
            <a href="#" onclick="renewClient('${client.id}'); return false;" class="renew-btn" aria-label="Renovar cliente"><i class="fas fa-sync"></i></a>
        ` : '';

        return `
            <div class="client-row" ${!isSearch ? `onclick="toggleDetails('${client.id}')"` : ''}>
                <div class="client-info">
                    <span>${client.cliente}</span>
                    <span class="due-date">Vence: ${formattedDate} - R$ ${client.valor}</span>
                </div>
                <div class="client-actions">${actionButtons}${foundPanel.nome}</div>
            </div>
            <div id="details-${client.id}" class="client-details ${isSearch ? 'open' : ''}">
                <p><strong>Tela:</strong> ${client.tela}</p>
                <p><strong>Valor:</strong> R$ ${client.valor}</p>
                <p><strong>Vencimento:</strong> ${formattedDate}</p>
                <p><strong>Painel:</strong> ${foundPanel.nome !== 'Painel não encontrado' ? `<a href="${foundPanel.link}" target="_blank">${foundPanel.nome}</a>` : foundPanel.nome}</p>
                <p><strong>MAC:</strong> ${client.mac || '-'}</p>
                <p><strong>Key:</strong> ${client.safekey || '-'}</p>
                <p><strong>Observações:</strong><br><textarea readonly>${client.observacoes || '-'}</textarea></p>
                <div class="actions">
                    <button onclick="openModal('${client.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <button onclick="deleteClient('${client.id}')"><i class="fas fa-trash"></i> Excluir</button>
                    <a href="https://wa.me/55${client.whats}" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                </div>
            </div>
        `;
    };

    const renderGroup = (clients, container, isSearch = false) => {
        clients.forEach(client => {
            container.innerHTML += renderClient(client, isSearch);
        });
    };

    renderGroup(vencidos, vencidosGroup);
    renderGroup(vencendo, vencendoGroup);
    renderGroup(emDia, emDiaGroup);

    const searchInput = document.getElementById("search");
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    if (searchTerm !== '') {
        document.getElementById("clientTable").querySelectorAll(".group-header:not(.todos), .group-content:not(#todos-content)").forEach(el => el.style.display = 'none');
        document.getElementById("todos-group").style.display = '';
        todosContent.classList.add('open');
        const filteredClients = clients.filter(client => 
            client.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.whats.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.painel.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderGroup(filteredClients, todosContent, true);
    } else {
        document.getElementById("clientTable").querySelectorAll(".group-header:not(.todos), .group-content:not(#todos-content)").forEach(el => el.style.display = '');
        document.getElementById("todos-group").style.display = 'none';
        todosContent.classList.remove('open');
    }

    await renderSummary();
}

function getWhatsAppMessage(type, client) {
    const messages = {
        due: localStorage.getItem("dueMessage") || DEFAULT_DUE_MESSAGE,
        renewal: localStorage.getItem("renewalMessage") || DEFAULT_RENEWAL_MESSAGE
    };
    const message = messages[type];
    return message
        .replace(/{cliente}/g, client.cliente)
        .replace(/{valor}/g, client.valor)
        .replace(/{vencimento}/g, formatDate(client.vencimento));
}

function validateMessage(message) {
    const validVariables = ['{cliente}', '{valor}', '{vencimento}'];
    const variableRegex = /\{[^}]+\}/g;
    const foundMessages = message.match(variableRegex) || [];
    const invalidMessages = foundMessages.filter(v => !validVariables.includes(v));
    return invalidMessages;
}

async function fetchPanels() {
    try {
        const response = await fetch(PANELS_API_URL);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Erro ao buscar painéis:", e);
        showToast("Erro ao buscar os painéis.", "error");
        return [];
    }
}

function toggleGroup(groupId) {
    const group = document.getElementById(`${groupId}-group`) || document.getElementById("todos-content");
    if (group) {
        group.classList.toggle("open");
        const header = document.querySelector(`.group-header.${groupId}`);
        if (header) {
            const icon = header.querySelector(".fas");
            if (icon) {
                icon.classList.toggle("fa-chevron-down");
                icon.classList.toggle("fa-chevron-up");
            }
        }
    }
}

function toggleDetails(clientId) {
    const details = document.getElementById(`details-${clientId}`);
    if (details) {
        if (openDetail !== null && openDetail !== clientId) {
            const previousDetails = document.getElementById(`details-${openDetail}`);
            if (previousDetails) previousDetails.classList.remove("open");
        }
        details.classList.toggle("open");
        openDetail = details.classList.contains("open") ? clientId : null;
        event.stopPropagation();
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo"
    }).format(date);
}

function setupFilters() {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", async () => {
            await renderClients(clients);
        });
    } else {
        console.error("Elemento com ID 'search' não encontrado.");
    }
}

function openModal(clientId = null) {
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const clientForm = document.getElementById("clientForm");
    if (!modal || !modalTitle || !clientForm) {
        console.error("Elementos do modal não encontrados.");
        return;
    }
    modalTitle.textContent = clientId ? "Editar Cliente" : "Novo Cliente";
    if (clientId !== null) {
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            showToast("Cliente não encontrado!", "error");
            return;
        }
        editingIndex = clients.findIndex(c => c.id === clientId);
        Object.keys(client).forEach(key => {
            const input = document.getElementById(key);
            if (input) input.value = client[key];
        });
    } else {
        editingIndex = null;
        clientForm.reset();
    }
    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

async function saveClient() {
    const clientForm = document.getElementById("clientForm");
    if (!clientForm) {
        console.error("Elemento com ID 'clientForm' não encontrado.");
        return;
    }
    const client = {
        cliente: document.getElementById("cliente").value,
        tela: document.getElementById("tela").value,
        desconto: parseFloat(document.getElementById("desconto").value) || 0,
        valor: parseFloat(document.getElementById("valor").value) || 0,
        whats: document.getElementById("whats").value,
        painel: document.getElementById("painel").value,
        mac: document.getElementById("mac").value,
        safekey: document.getElementById("safekey").value,
        observacoes: document.getElementById("observacoes").value,
        vencimento: document.getElementById("vencimento").value,
    };
    client.valor = (client.valor * (1 - client.desconto / 100)).toFixed(2);
    if (isNaN(client.valor) || client.valor <= 0) {
        showToast("Por favor, insira um valor válido!", "error");
        return;
    }
    if (!client.cliente || !client.whats || !client.painel || !client.vencimento) {
        showToast("Por favor, preencha todos os campos obrigatórios!", "error");
        return;
    }
    try {
        const method = editingIndex !== null ? 'PUT' : 'POST';
        const url = editingIndex !== null ? `${API_URL}/${clients[editingIndex].id}` : API_URL;
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        showToast("Cliente salvo com sucesso!", "success");
        await loadClients();
    } catch (e) {
        console.error('Erro ao salvar o cliente:', e);
        showToast("Erro ao salvar o cliente!", "error");
    }
}

async function deleteClient(clientId) {
    if (!confirm("Tem certeza que deseja excluir? A exclusão será permanente!")) return;
    try {
        const response = await fetch(`${API_URL}/${clientId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        clients = clients.filter(client => client.id !== clientId);
        await renderClients(clients);
        showToast("Cliente excluído com sucesso!", "success");
    } catch (e) {
        console.error("Erro ao excluir o cliente:", e);
        showToast("Erro ao excluir o cliente!", "error");
    }
}

async function renewClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showToast("Cliente não encontrado!", "error");
        return;
    }
    let monthsToAdd = prompt("Quantos meses deseja adicionar à renovação?", "1");
    monthsToAdd = parseInt(monthsToAdd);
    if (isNaN(monthsToAdd) || monthsToAdd <= 0) {
        showToast("Por favor, insira um número válido de meses!", "error");
        return;
    }
    let updatedClient = { ...client };
    let currentDate = new Date(updatedClient.vencimento);
    let originalDay = currentDate.getDate();
    currentDate.setMonth(currentDate.getMonth() + monthsToAdd);
    if (currentDate.getDate() !== originalDay) {
        currentDate.setDate(0);
    }
    updatedClient.vencimento = currentDate.toISOString().split("T")[0];
    try {
        const response = await fetch(`${API_URL}/${updatedClient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedClient)
        });
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        await loadClients();
        const renewalMessage = getWhatsAppMessage("renewal", updatedClient);
        window.open(`https://wa.me/55${updatedClient.whats}?text=${encodeURIComponent(renewalMessage)}`, "_blank");
        showToast("Cliente renovado com sucesso!", "success");
    } catch (e) {
        console.error("Erro ao renovar o cliente:", e);
        showToast("Erro ao renovar o cliente!", "error");
    }
}

function openPanelManager() {
    const panelManagerModal = document.getElementById('panelManagerModal');
    if (panelManagerModal) {
        panelManagerModal.style.display = 'flex';
        fetchPanels();
    } else {
        console.error("Elemento com ID 'panelManagerModal' não encontrado.");
    }
}

function closePanelManager() {
    const panelManagerModal = document.getElementById('panelManagerModal');
    if (panelManagerModal) {
        panelManagerModal.style.display = 'none';
    }
}

async function fetchPanels() {
    try {
        const response = await fetch(PANELS_API_URL);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        updatePanelList(data);
        updatePanelSelect(data);
        return data;
    } catch (e) {
        console.error("Erro ao buscar painéis:", e);
        showToast("Erro ao buscar os painéis.", "error");
        return [];
    }
}

function updatePanelList(paineis) {
    const panelList = document.getElementById('panelList');
    if (!panelList) {
        console.error("Elemento com ID 'panelList' não encontrado.");
        return;
    }
    panelList.innerHTML = "";
    paineis.forEach(panel => {
        const li = document.createElement('li');
        li.classList.add("panel-item");
        li.innerHTML = `
            <span>${panel.nome} - <a href="${panel.link}" target="_blank">${panel.link}</a> - R$ ${parseFloat(panel.valorCredito).toFixed(2)} (${panel.status})</span>
            <button onclick="editPanel('${panel.id}', '${panel.nome}', '${panel.link}', '${panel.valorCredito}', '${panel.status}')"><i class="fas fa-edit"></i></button>
            <button onclick="deletePanel('${panel.id}')"><i class="fas fa-trash"></i></button>
        `;
        panelList.appendChild(li);
    });
}

function updatePanelSelect(paineis) {
    const panelSelect = document.getElementById('painel');
    if (!panelSelect) {
        console.error("Elemento com ID 'painel' não encontrado.");
        return;
    }
    panelSelect.innerHTML = `<option value="">Selecione um painel</option>`;
    paineis.forEach(panel => {
        if (panel.status === 'active') {
            const option = document.createElement('option');
            option.value = panel.id;
            option.textContent = panel.nome;
            panelSelect.appendChild(option);
        }
    });
}

async function savePanel() {
    const panelForm = document.getElementById('panelForm');
    if (!panelForm) {
        console.error("Elemento com ID 'panelForm' não encontrado.");
        return;
    }
    const id = document.getElementById('panelId').value;
    const nome = document.getElementById('panelName').value;
    const link = document.getElementById('panelLink').value;
    const valorCredito = parseFloat(document.getElementById('valorCredito').value) || 0;
    const status = document.getElementById('panelStatus').value;
    const panelData = { nome, link, valorCredito, status };
    if (valorCredito < 0) {
        showToast("O valor do crédito não pode ser negativo!", "error");
        return;
    }
    try {
        const response = id
            ? await fetch(`${PANELS_API_URL}/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(panelData),
              })
            : await fetch(PANELS_API_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(panelData),
              });
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        document.getElementById('panelForm').reset();
        document.getElementById('panelId').value = '';
        await fetchPanels();
        showToast("Painel salvo com sucesso!", "success");
    } catch (e) {
        console.error("Erro ao salvar o painel:", e);
        showToast("Erro ao salvar o painel!", "error");
    }
}

function editPanel(id, nome, link, valorCredito, status) {
    const panelId = document.getElementById('panelId');
    const panelName = document.getElementById('panelName');
    const panelLink = document.getElementById('panelLink');
    const valorCreditoInput = document.getElementById('valorCredito');
    const panelStatus = document.getElementById('panelStatus');
    if (panelId && panelName && panelLink && valorCreditoInput && panelStatus) {
        panelId.value = id;
        panelName.value = nome;
        panelLink.value = link;
        valorCreditoInput.value = valorCredito;
        panelStatus.value = status;
    } else {
        console.error("Um ou mais elementos do formulário de painel não foram encontrados.");
    }
}

async function deletePanel(id) {
    if (!confirm("Você tem certeza de que deseja excluir este painel?")) return;
    try {
        const response = await fetch(`${PANELS_API_URL}/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        await fetchPanels();
        showToast("Painel excluído com sucesso!", "success");
    } catch (e) {
        console.error("Erro ao excluir o painel:", e);
        showToast("Erro ao excluir o painel!", "error");
    }
}

async function renderSummary() {
    const totalClientsElement = document.getElementById("totalClients");
    const totalValueElement = document.getElementById("totalValue");
    if (!totalClientsElement || !totalValueElement) {
        console.error("Elementos de resumo não encontrados.");
        return;
    }
    const totalClients = clients.length;
    const paineis = await fetchPanels();
    let totalValue = clients.reduce((sum, client) => {
        const foundPanel = paineis.find(p => p.id === client.painel) || { valorCredito: 0 };
        const valorPlano = parseFloat(client.valor) || 0;
        const valorCredito = parseFloat(foundPanel.valorCredito) || 0;
        return sum + (valorPlano - valorCredito);
    }, 0).toFixed(2);
    totalClientsElement.textContent = totalClients;
    totalValueElement.textContent = `R$ ${totalValue}`;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function updateThemeIcon() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) {
        console.error("Elemento com ID 'themeToggleBtn' não encontrado.");
        return;
    }
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
        if (currentTheme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            themeToggleBtn.setAttribute('aria-label', 'Alternar para tema claro');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            themeToggleBtn.setAttribute('aria-label', 'Alternar para tema escuro');
        }
    }
}

function logout() {
    localStorage.removeItem('theme');
    localStorage.removeItem('dueMessage');
    localStorage.removeItem('renewalMessage');
    showToast("Logout realizado com sucesso!", "success");
    setTimeout(() => window.location.href = "index.html", 1000);
}

function openWhatsAppMessagesModal() {
    const whatsappMessagesModal = document.getElementById('whatsappMessagesModal');
    if (whatsappMessagesModal) {
        whatsappMessagesModal.style.display = 'flex';
    } else {
        console.error("Elemento com ID 'whatsappMessagesModal' não encontrado.");
    }
}

function closeWhatsAppMessagesModal() {
    const whatsappMessagesModal = document.getElementById('whatsappMessagesModal');
    if (whatsappMessagesModal) {
        whatsappMessagesModal.style.display = 'none';
    }
}

function loadWhatsAppMessages() {
    const dueMessageInput = document.getElementById('dueMessage');
    const renewalMessageInput = document.getElementById('renewalMessage');
    if (!dueMessageInput || !renewalMessageInput) {
        console.error("Elementos de mensagens do WhatsApp não encontrados.");
        return;
    }
    const dueMessage = localStorage.getItem('dueMessage') || DEFAULT_DUE_MESSAGE;
    const renewalMessage = localStorage.getItem('renewalMessage') || DEFAULT_RENEWAL_MESSAGE;
    dueMessageInput.value = dueMessage;
    renewalMessageInput.value = renewalMessage;
}

function setupWhatsAppMessagesForm() {
    const whatsappMessagesForm = document.getElementById('whatsappMessagesForm');
    const applyMessagesBtn = document.getElementById('applyMessagesBtn');
    if (!whatsappMessagesForm || !applyMessagesBtn) {
        console.error("Elementos do formulário de mensagens do WhatsApp não encontrados.");
        return;
    }

    whatsappMessagesForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const dueMessage = document.getElementById('dueMessage').value;
        const renewalMessage = document.getElementById('renewalMessage').value;

        if (!dueMessage || !renewalMessage) {
            showToast("Por favor, preencha ambas as mensagens!", "error");
            return;
        }

        const invalidVars = [...new Set([...validateMessage(dueMessage), ...validateMessage(renewalMessage)])];
        if (invalidVars.length > 0) {
            showToast(`Variáveis inválidas encontradas: ${invalidVars.join(', ')}. Use apenas {cliente}, {valor}, {vencimento}!`, "error");
            return;
        }

        localStorage.setItem('dueMessage', dueMessage);
        localStorage.setItem('renewalMessage', renewalMessage);
        showToast("Mensagens salvas com sucesso!", "success");
        closeWhatsAppMessagesModal();
    });

    applyMessagesBtn.addEventListener('click', function () {
        const dueMessage = document.getElementById('dueMessage').value;
        const renewalMessage = document.getElementById('renewalMessage').value;

        if (!dueMessage || !renewalMessage) {
            showToast("Por favor, preencha ambas as mensagens!", "error");
            return;
        }

        const invalidVars = [...new Set([...validateMessage(dueMessage), ...validateMessage(renewalMessage)])];
        if (invalidVars.length > 0) {
            showToast(`Variáveis inválidas encontradas: ${invalidVars.join(', ')}. Use apenas {cliente}, {valor}, {vencimento}!`, "error");
            return;
        }

        localStorage.setItem('dueMessage', dueMessage);
        localStorage.setItem('renewalMessage', renewalMessage);
        showToast("Mensagens aplicadas com sucesso!", "success");
    });
}

        
// Função para formatar a data e hora
  function formatDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // +1 porque meses começam em 0
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  // Função para atualizar a mensagem de boas-vindas
  function updateWelcomeMessage(fullName) {
    document.getElementById('welcomeMessage').textContent = 
      `Bem vindo ${fullName}`;
  }

  // Função para verificar o token
  async function verifyToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      if (!result.valid) {
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
      } else {
        // Token válido, inicia a atualização em tempo real com o nome completo
        updateWelcomeMessage(result.fullName);
        setInterval(() => updateWelcomeMessage(result.fullName), 1000);
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      localStorage.removeItem('authToken');
      window.location.href = 'index.html';
    }
  }

  // Verifica o token ao carregar a página
  verifyToken();

  // Logout
  document.getElementById('logoutB').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
  });
