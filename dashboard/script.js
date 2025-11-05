document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeEventListeners();
    initializeChart();
    loadUserServers(); // Carrega os servidores do usuário
    loadDashboardData();
});

// ===== NAVEGAÇÃO ENTRE SEÇÕES =====
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSectionId = item.getAttribute('data-section');

            // Remover classe active de todos os itens
            navItems.forEach(nav => nav.classList.remove('active'));
            dashboardSections.forEach(section => section.classList.remove('active'));

            // Adicionar classe active ao item clicado
            item.classList.add('active');

            // Mostrar seção alvo
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                // Scroll para o topo
                document.querySelector('.main-content').scrollTop = 0;
            }
        });
    });
}

// Função para carregar os servidores do usuário
async function loadUserServers() {
    // Pegar o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    try {
        // Fazer a requisição para obter os dados do usuário
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('Erro ao carregar dados do usuário');
        }

        const userData = await userResponse.json();
        updateUserInfo(userData);

        // Fazer a requisição para a API do Discord para obter os servidores
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar servidores');
        }

        const guilds = await response.json();
        
        // Filtrar servidores onde o usuário tem permissão de administrador (0x8)
        const adminGuilds = guilds.filter(g => {
            const permissions = BigInt(g.permissions);
            return (permissions & BigInt(0x8)) === BigInt(0x8);
        });

        // Atualizar o select de servidores
        const serverSelect = document.getElementById('server-select');
        serverSelect.innerHTML = ''; // Limpar opções existentes

        adminGuilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = guild.name;
            serverSelect.appendChild(option);
        });

        // Armazenar o token na sessionStorage
        sessionStorage.setItem('discord_token', token);

        // Carregar dados do primeiro servidor
        if (adminGuilds.length > 0) {
            loadServerData(adminGuilds[0].id);
        }
    } catch (error) {
        console.error('Erro ao carregar servidores:', error);
        showNotification('Erro ao carregar servidores. Por favor, faça login novamente.', 'error');
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Seletor de servidor
    const serverSelect = document.getElementById('server-select');
    if (serverSelect) {
        serverSelect.addEventListener('change', (event) => {
            const selectedServer = event.target.options[event.target.selectedIndex].text;
            showNotification(`Carregando dados do servidor: ${selectedServer}`, 'info');
            loadServerData(event.target.value);
        });
    }

    // Botões de salvar configurações
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(button => {
        button.addEventListener('click', handleSaveSettings);
    });

    // Botão de notificações
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', handleNotifications);
    }

    // Botão de logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Botão de atualizar
    const refreshBtn = document.querySelector('.btn-secondary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }
}

// ===== HANDLERS DE EVENTOS =====
function handleServerChange(event) {
    const selectedServer = event.target.options[event.target.selectedIndex].text;
    showNotification(`Carregando dados do servidor: ${selectedServer}`, 'info');
    
    // Simulação de carregamento
    setTimeout(() => {
        showNotification(`Dashboard atualizado para: ${selectedServer}`, 'success');
        loadDashboardData();
    }, 1000);
}

function handleSaveSettings(event) {
    event.preventDefault();
    showNotification('Configurações salvas com sucesso!', 'success');
    
    // Aqui você faria uma chamada AJAX/Fetch para enviar os dados
    console.log('Salvando configurações...');
}

function handleNotifications(event) {
    event.preventDefault();
    showNotification('Você tem 3 notificações não lidas', 'info');
}

function handleLogout(event) {
    event.preventDefault();
    if (confirm('Tem certeza que deseja sair?')) {
        sessionStorage.removeItem('discord_token');
        showNotification('Saindo...', 'info');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    }
}

// Função para carregar dados do servidor selecionado
async function loadServerData(serverId) {
    try {
        const token = sessionStorage.getItem('discord_token');
        if (!token) {
            throw new Error('Token não encontrado');
        }

        // Buscar informações do servidor a partir do cache dos servidores
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Erro na resposta da API:', await response.text());
            throw new Error('Erro ao carregar lista de servidores');
        }

        const guilds = await response.json();
        const serverData = guilds.find(g => g.id === serverId);
        
        if (!serverData) {
            throw new Error('Servidor não encontrado');
        }

        // Em vez de tentar obter dados detalhados que podem requerer permissões adicionais,
        // vamos usar os dados que já temos do servidor
        let memberCount = 0;
        let onlineCount = 0;

        // Tenta obter o número aproximado de membros do servidor, se disponível
        try {
            const countResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}?with_counts=true`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (countResponse.ok) {
                const countData = await countResponse.json();
                memberCount = countData.approximate_member_count || 0;
                onlineCount = countData.approximate_presence_count || 0;
            }
        } catch (countError) {
            console.warn('Não foi possível obter contagens detalhadas:', countError);
            // Continue com os dados básicos que já temos
        }
        
        updateDashboardWithServerData(serverData);
        
        const serverStats = {
            members: memberCount || serverData.member_count || '?',
            online: onlineCount || '?',
            commands_used: 0, // Este valor precisaria vir do seu bot
            bot_status: 'online' // Este valor também precisaria vir do seu bot
        };
        
        // Atualizar dados básicos do servidor primeiro
        updateDashboardWithServerData({
            name: serverData.name,
            icon: serverData.icon,
            id: serverData.id
        });
        
        // Atualizar o ícone do servidor se disponível
        if (serverData.icon) {
            const serverIcon = `https://cdn.discordapp.com/icons/${serverData.id}/${serverData.icon}.png?size=128`;
            document.querySelector('.server-selector i').style.backgroundImage = `url(${serverIcon})`;
        }
        
        // Depois atualizar as estatísticas
        updateDashboardStats(serverStats);
    } catch (error) {
        console.error('Erro ao carregar dados do servidor:', error);
        showNotification('Erro ao carregar dados do servidor', 'error');
    }
}

// Nova função para atualizar estatísticas do dashboard
function updateDashboardStats(data) {
    const statValues = document.querySelectorAll('.stat-value');
    
    // Atualizar número de membros
    if (statValues[0]) {
        statValues[0].textContent = typeof data.members === 'number' ? formatNumber(data.members) : data.members;
        const statChange = statValues[0].nextElementSibling;
        if (statChange) {
            statChange.textContent = 'membros no total';
        }
    }
    
    // Atualizar número de membros online
    if (statValues[1]) {
        statValues[1].textContent = typeof data.online === 'number' ? formatNumber(data.online) : data.online;
        const statChange = statValues[1].nextElementSibling;
        if (statChange) {
            statChange.textContent = 'membros online';
        }
    }
    
    // Atualizar comandos usados
    if (statValues[2]) {
        statValues[2].textContent = formatNumber(data.commands_used);
        const statChange = statValues[2].nextElementSibling;
        if (statChange) {
            statChange.textContent = `+${Math.floor(data.commands_used * 0.05)} hoje`;
        }
    }
    
    // Atualizar status do bot
    if (statValues[3]) {
        statValues[3].textContent = data.bot_status.charAt(0).toUpperCase() + data.bot_status.slice(1);
        const statChange = statValues[3].nextElementSibling;
        if (statChange) {
            statChange.textContent = `Ping: ${Math.floor(Math.random() * 30) + 20}ms`;
        }
    }
}

function updateDashboardWithServerData(serverData) {
    // Atualizar elementos do dashboard com os dados do servidor
    document.querySelector('.header-subtitle').textContent = `Gerenciando ${serverData.name}`;
    
    // Atualizar estatísticas
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 1) {
        statValues[0].textContent = serverData.approximate_member_count || 'N/A';
    }
    if (statValues.length >= 2) {
        const channels = serverData.channels?.length || 'N/A';
        statValues[1].textContent = channels;
    }

    // Atualizar outras informações do servidor conforme necessário
}

// ===== GRÁFICO COM CHART.JS =====
function initializeChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
            datasets: [
                {
                    label: 'Mensagens',
                    data: [120, 150, 200, 180, 220, 250, 300],
                    borderColor: '#7289da',
                    backgroundColor: 'rgba(114, 137, 218, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7289da',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
                {
                    label: 'Comandos',
                    data: [80, 100, 120, 110, 140, 160, 180],
                    borderColor: '#43b581',
                    backgroundColor: 'rgba(67, 181, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#43b581',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f0f0f0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 12,
                            weight: '500'
                        },
                        padding: 15,
                        usePointStyle: true,
                    }
                },
                filler: {
                    propagate: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(58, 63, 91, 0.3)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        }
                    }
                }
            }
        }
    });

    return chart;
}

// ===== CARREGAR DADOS DO DASHBOARD =====
function loadDashboardData() {
    // Simulação de carregamento de dados
    console.log('Carregando dados do dashboard...');
    
    // Aqui você faria chamadas AJAX/Fetch para carregar dados do backend
    // Exemplo:
    // fetch('/api/dashboard/stats')
    //     .then(response => response.json())
    //     .then(data => updateDashboardStats(data))
    //     .catch(error => console.error('Erro ao carregar dados:', error));
    
    // Por enquanto, apenas uma simulação
    animateStatCards();
}

// ===== ANIMAR CARDS DE ESTATÍSTICAS =====
function animateStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===== SISTEMA DE NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Adicionar estilos de notificação se não existirem
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #2d3047;
                border: 1px solid #3a3f5b;
                border-radius: 8px;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out;
                z-index: 9999;
                max-width: 400px;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #f0f0f0;
                font-size: 0.95rem;
            }

            .notification-success {
                border-left: 4px solid #43b581;
            }

            .notification-success .notification-content i {
                color: #43b581;
            }

            .notification-error {
                border-left: 4px solid #f04747;
            }

            .notification-error .notification-content i {
                color: #f04747;
            }

            .notification-warning {
                border-left: 4px solid #faa61a;
            }

            .notification-warning .notification-content i {
                color: #faa61a;
            }

            .notification-info {
                border-left: 4px solid #7289da;
            }

            .notification-info .notification-content i {
                color: #7289da;
            }

            .notification-close {
                background: none;
                border: none;
                color: #b0b0b0;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s;
            }

            .notification-close:hover {
                color: #f0f0f0;
            }
        `;
        document.head.appendChild(style);
    }

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Botão de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ===== OBTER ÍCONE DE NOTIFICAÇÃO =====
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Função para atualizar as informações do usuário
function updateUserInfo(userData) {
    // Atualizar nome do usuário
    const usernameEl = document.querySelector('.username');
    if (usernameEl) {
        usernameEl.textContent = userData.username;
    }

    // Atualizar avatar do usuário
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userAvatarEl) {
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
            : 'https://discord.com/assets/default-avatar.png';
        userAvatarEl.src = avatarUrl;
    }

    // Atualizar avatar do bot
    const botAvatarEl = document.querySelector('.bot-avatar');
    if (botAvatarEl) {
        // Para o bot, vamos usar o CLIENT_ID que está armazenado no sessionStorage
        const clientId = sessionStorage.getItem('client_id');
        if (clientId) {
            fetch(`https://discord.com/api/v10/applications/${clientId}`, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem('discord_token')}`
                }
            })
            .then(response => response.json())
            .then(botData => {
                if (botData.icon) {
                    botAvatarEl.src = `https://cdn.discordapp.com/app-icons/${clientId}/${botData.icon}.png?size=128`;
                }
            })
            .catch(console.error);
        }
    }
}

// ===== FUNÇÕES AUXILIARES =====

// Formatar números com separadores
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Obter data formatada
function getFormattedDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('pt-BR', options);
}

// Verificar se o usuário está autenticado
function checkAuthentication() {
    // Aqui você verificaria se o usuário está logado
    // Se não estiver, redirecionar para login
    console.log('Verificando autenticação...');
}

// ===== EXPORTAR FUNÇÕES =====
window.dashboardUtils = {
    formatNumber,
    getFormattedDate,
    showNotification,
    loadDashboardData
};