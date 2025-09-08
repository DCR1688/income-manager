// ==== 配置信息 ==== 
// 把下面的内容改成您自己的！
const GITHUB_OWNER = 'DCR1688'; // 替换为你的GitHub用户名
const GITHUB_REPO = 'income-manager'; // 替换为你的仓库名称，例如 'my-income-data'
const GITHUB_PATH = 'encrypted-data.json'; // 存储在仓库中的加密数据文件名
// const GITHUB_TOKEN = '你的Token'; // 【重要】不要直接写在这里！后面会教你怎么安全处理。
let masterPassword = ''; // 这个由用户每次使用时输入
// 加密函数
function encryptData(dataString, password) {
    try {
        const encrypted = CryptoJS.AES.encrypt(dataString, password);
        return encrypted.toString();
    } catch (error) {
        console.error('加密失败:', error);
        throw new Error('数据加密过程中出现错误');
    }
}

// 解密函数
function decryptData(encryptedString, password) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedString, password);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
            throw new Error('解密失败或密码错误');
        }
        return decrypted;
    } catch (error) {
        console.error('解密失败:', error);
        throw new Error('数据解密失败，请检查密码是否正确');
    }
}
// 保存加密数据到GitHub
async function saveDataToGitHub(encryptedData, token) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    const commitMessage = 'Update encrypted income data';
    const contentBase64 = btoa(unescape(encodeURIComponent(encryptedData)));

    let fileSha = '';
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'IncomeManagerApp'
            }
        });
        if (response.ok) {
            const fileInfo = await response.json();
            fileSha = fileInfo.sha;
        }
    } catch (error) {
        console.log('文件可能不存在，将创建新文件');
    }

    const body = {
        message: commitMessage,
        content: contentBase64,
    };
    if (fileSha) {
        body.sha = fileSha;
    }

    const putResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'IncomeManagerApp'
        },
        body: JSON.stringify(body)
    });

    if (!putResponse.ok) {
        const error = await putResponse.json();
        throw new Error(`保存到GitHub失败: ${error.message}`);
    }

    const result = await putResponse.json();
    console.log('数据已加密保存到GitHub！', result);
    return result;
}

// 从GitHub加载加密数据
async function loadDataFromGitHub(token) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'IncomeManagerApp'
            }
        });

        if (response.status === 404) {
            return null; // 文件不存在，返回null
        }

        if (!response.ok) {
            throw new Error(`从GitHub加载数据失败: ${response.statusText}`);
        }

        const fileInfo = await response.json();
        const encryptedContent = atob(fileInfo.content); // 解码Base64
        return encryptedContent;

    } catch (error) {
        console.error('读取数据失败:', error);
        throw error;
    }
}
// 设置主密码
function setMasterPassword() {
    const passwordInput = document.getElementById('master-password-input');
    if (!passwordInput.value) {
        alert('请先输入加密密码！');
        return;
    }
    masterPassword = passwordInput.value;
    alert('加密密码已设置！');
    // 你可以在这里触发自动加载数据
    // loadAndDecryptData();
}

// 获取GitHub Token（示例：从弹出提示框获取）
function getGitHubToken() {
    // 注意：这只是为了演示，在实际应用中，你需要更安全的方式
    return prompt('请输入你的GitHub Personal Access Token：');
}
// 整合：加密并保存数据
async function encryptAndSaveData(dataToSave, token) {
    if (!masterPassword) {
        alert('请先设置加密密码！');
        return;
    }
    try {
        const dataString = JSON.stringify(dataToSave);
        const encryptedData = encryptData(dataString, masterPassword);
        await saveDataToGitHub(encryptedData, token);
        alert('数据已加密保存到云端！');
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 整合：加载并解密数据
async function loadAndDecryptData(token) {
    if (!masterPassword) {
        alert('请先设置加密密码！');
        return null;
    }
    try {
        const encryptedData = await loadDataFromGitHub(token);
        if (!encryptedData) {
            alert('没有找到云端数据！');
            return null;
        }
        const decryptedString = decryptData(encryptedData, masterPassword);
        const incomeData = JSON.parse(decryptedString);
        console.log('数据加载并解密成功！', incomeData);
        return incomeData;
    } catch (error) {
        console.error('加载失败:', error);
        alert('加载失败: ' + error.message);
        return null;
    }
}
