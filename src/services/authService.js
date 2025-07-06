import axios from "axios";

export class AuthService {
  static async loginToArxiv(username, password) {
    try {
      // arXiv doesn't have a public API for user authentication
      // This is a placeholder for future implementation
      // For now, we'll store user credentials locally for paper submission access

      const userData = {
        username,
        source: "arxiv",
        loggedIn: true,
        loginTime: Date.now(),
      };

      // Store in app data
      const appDataPath = await window.electronAPI.getAppDataPath();
      await window.electronAPI.ensureDirectory(appDataPath);

      const authFile = `${appDataPath}/auth.json`;
      await window.electronAPI.writeFile(
        authFile,
        JSON.stringify(
          {
            arxiv: userData,
          },
          null,
          2
        )
      );

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async loginToBiorxiv(username, password) {
    try {
      // bioRxiv also doesn't have public auth API
      // This is a placeholder for future implementation

      const userData = {
        username,
        source: "biorxiv",
        loggedIn: true,
        loginTime: Date.now(),
      };

      const appDataPath = await window.electronAPI.getAppDataPath();
      await window.electronAPI.ensureDirectory(appDataPath);

      const authFile = `${appDataPath}/auth.json`;

      // Read existing auth data
      let authData = {};
      const exists = await window.electronAPI.fileExists(authFile);
      if (exists) {
        const result = await window.electronAPI.readFile(authFile);
        if (result.success) {
          authData = JSON.parse(result.data.toString());
        }
      }

      authData.biorxiv = userData;
      await window.electronAPI.writeFile(
        authFile,
        JSON.stringify(authData, null, 2)
      );

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getCurrentUser() {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const authFile = `${appDataPath}/auth.json`;
      const exists = await window.electronAPI.fileExists(authFile);

      if (exists) {
        const result = await window.electronAPI.readFile(authFile);
        if (result.success) {
          const authData = JSON.parse(result.data.toString());

          // Return the most recently logged in user
          let latestUser = null;
          let latestTime = 0;

          for (const [source, userData] of Object.entries(authData)) {
            if (userData.loggedIn && userData.loginTime > latestTime) {
              latestUser = userData;
              latestTime = userData.loginTime;
            }
          }

          return latestUser;
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }

  static async logout(source) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const authFile = `${appDataPath}/auth.json`;
      const exists = await window.electronAPI.fileExists(authFile);

      if (exists) {
        const result = await window.electronAPI.readFile(authFile);
        if (result.success) {
          const authData = JSON.parse(result.data.toString());

          if (authData[source]) {
            authData[source].loggedIn = false;
            await window.electronAPI.writeFile(
              authFile,
              JSON.stringify(authData, null, 2)
            );
          }
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async logoutAll() {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const authFile = `${appDataPath}/auth.json`;
      const exists = await window.electronAPI.fileExists(authFile);

      if (exists) {
        const result = await window.electronAPI.readFile(authFile);
        if (result.success) {
          const authData = JSON.parse(result.data.toString());

          for (const source in authData) {
            authData[source].loggedIn = false;
          }

          await window.electronAPI.writeFile(
            authFile,
            JSON.stringify(authData, null, 2)
          );
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
