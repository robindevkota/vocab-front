import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { ChatProvider } from "./Context/ChatContext";
import { ConfigProvider } from "antd";
import AntdConfig from "./utils/antdConfig";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ConfigProvider theme={AntdConfig}>
      <ChatProvider>
        <Provider store={store}>
          <App />
        </Provider>
      </ChatProvider>
    </ConfigProvider>
  </React.StrictMode>
);
