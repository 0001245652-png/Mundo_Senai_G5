const SERVIDOR_URL = 'http://localhost:3000/api/lampada';
        const TIMEOUT_MS = 6000;
        let lampadaAcesa = false;
        let modoSimulacao = true;

        const lampWrapper = document.getElementById('lampWrapper');
        const btnToggle = document.getElementById('btnToggle');
        const btnText = document.getElementById('btnText');
        const btnIcon = document.getElementById('btnIcon');
        const btnSpinner = document.getElementById('btnSpinner');
        const statusContainer = document.getElementById('statusContainer');
        const statusMessage = document.getElementById('statusMessage');
        const simularCheck = document.getElementById('simularCheck');

        window.addEventListener('DOMContentLoaded', () => {
            modoSimulacao = simularCheck.checked;
            if (modoSimulacao) {
                atualizarStatus('Modo Simulação Ativo (Offline)', 'idle');
            } else {
                obterEstadoInicialServidor();
            }
        });

        function atualizarModoSimulacao() {
            modoSimulacao = simularCheck.checked;
            if (modoSimulacao) {
                atualizarStatus('Modo Simulação Ativo (Offline)', 'idle');
            } else {
                atualizarStatus('Conectando ao Servidor...', 'loading');
                obterEstadoInicialServidor();
            }
        }

        async function obterEstadoInicialServidor() {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const resposta = await fetch(SERVIDOR_URL, {
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (resposta.ok) {
                    const dados = await resposta.json();
                    lampadaAcesa = !!dados.acesa;
                    atualizarVisualLampada(lampadaAcesa);
                    atualizarStatus('Conectado ao Servidor (Tuya)', 'success');
                } else {
                    atualizarStatus('Erro ao buscar status do servidor', 'error');
                }
            } catch (erro) {
                console.error('Falha ao sincronizar estado inicial:', erro);
                atualizarStatus('Servidor offline ou inacessível', 'error');
            }
        }

        async function alternarLampada() {
            const novoEstado = !lampadaAcesa;
            const acaoTexto = novoEstado ? 'Ligando' : 'Desligando';

            definirEstadoCarregando(true, `${acaoTexto}...`);
            atualizarStatus('Enviando requisição para o servidor...', 'loading');

            if (modoSimulacao) {
                await simularRespostaServidor(novoEstado);
                return;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const resposta = await fetch(SERVIDOR_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        acesa: novoEstado
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!resposta.ok) {
                    throw new Error(`Servidor respondeu com código de erro: ${resposta.status}`);
                }

                const dados = await resposta.json().catch(() => ({}));
                lampadaAcesa = novoEstado;
                atualizarVisualLampada(lampadaAcesa);
                atualizarStatus(dados.mensagem || `Sucesso! Lâmpada ${lampadaAcesa ? 'Ligada' : 'Desligada'}.`, 'success');
            } catch (erro) {
                console.error('Erro na comunicação com o servidor:', erro);
                let mensagemErro = 'Erro na comunicação com o servidor.';

                if (erro.name === 'AbortError') {
                    mensagemErro = 'Tempo limite esgotado (Servidor sem resposta).';
                } else if (navigator.onLine === false) {
                    mensagemErro = 'Sem conexão com a internet.';
                } else if (erro.message && erro.message.includes('Failed to fetch')) {
                    mensagemErro = 'Não foi possível conectar ao servidor. Verifique se o server.js está rodando.';
                } else {
                    mensagemErro = erro.message;
                }

                atualizarStatus(mensagemErro, 'error');
            } finally {
                definirEstadoCarregando(false);
            }
        }

        async function simularRespostaServidor(novoEstado) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    lampadaAcesa = novoEstado;
                    atualizarVisualLampada(lampadaAcesa);

                    const estadoTexto = lampadaAcesa ? 'Ligada' : 'Desligada';
                    atualizarStatus(`Lâmpada ${estadoTexto} com Sucesso! (Simulado)`, 'success');
                    definirEstadoCarregando(false);
                    resolve();
                }, 700);
            });
        }

        function atualizarVisualLampada(acesa) {
            if (acesa) {
                lampWrapper.classList.add('active');
                btnText.textContent = 'Desligar Lâmpada';
            } else {
                lampWrapper.classList.remove('active');
                btnText.textContent = 'Ligar Lâmpada';
            }
        }

        function atualizarStatus(mensagem, tipo) {
            statusMessage.textContent = mensagem;
            statusContainer.className = 'status-container ' + tipo;
        }

        function definirEstadoCarregando(carregando, textoTemporario) {
            btnToggle.disabled = carregando;

            if (carregando) {
                btnSpinner.style.display = 'block';
                btnIcon.style.display = 'none';
                if (textoTemporario) btnText.textContent = textoTemporario;
            } else {
                btnSpinner.style.display = 'none';
                btnIcon.style.display = 'block';
                btnText.textContent = lampadaAcesa ? 'Desligar Lâmpada' : 'Ligar Lâmpada';
            }
        }