import React, { useState } from "react";
import { Layout, Menu, Button, Drawer } from "antd";
import { MenuOutlined, UserOutlined, LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout, RESET } from "../../redux/features/auth/authSlice";
import { ShowOnLogin, ShowOnLogout } from "../protect/hiddenLink";
import { UserName } from "../../pages/profile/Profile";
import "./Header.scss";

const { Header } = Layout;

const AppHeader = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const showDrawer = () => setVisible(true);
  const onClose = () => setVisible(false);

  const logoutUser = async () => {
    dispatch(RESET());
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <Header className="app-header" style={{ backgroundColor: "#030b6b", padding: "0 20px" }}>
      <div className="logo" onClick={() => navigate("/")}>
        <span style={{ color: "#fff", fontSize: "24px", fontWeight: "bold", cursor: "pointer" }}>
          VocabMate
        </span>
      </div>

      <div className="desktop-menu">
        <Menu theme="dark" mode="horizontal" style={{ backgroundColor: "#030b6b" }}>
          <ShowOnLogin>
            <Menu.Item key="user" icon={<UserOutlined />} style={{ color: "#fff" }}>
              <UserName />
            </Menu.Item>
            <Menu.Item key="profile">
              <Link to="/profile" style={{ color: "#fff" }}>Profile</Link>
            </Menu.Item>
            <Menu.Item key="collection">
              <Link to="/addword" style={{ color: "#fff" }}>Collection</Link>
            </Menu.Item>
            <Menu.Item key="logout" icon={<LogoutOutlined />}>
              <Button type="link" onClick={logoutUser} style={{ color: "#fff" }}>
                Logout
              </Button>
            </Menu.Item>
          </ShowOnLogin>

          <ShowOnLogout>
            <Menu.Item key="login" icon={<LoginOutlined />}>
              <Link to="/login" style={{ color: "#fff" }}>Login</Link>
            </Menu.Item>
          </ShowOnLogout>
        </Menu>
      </div>

      <Button className="menu-button" type="text" icon={<MenuOutlined />} onClick={showDrawer} style={{ color: "#fff" }} />

      <Drawer title="Menu" placement="right" onClose={onClose} open={visible} bodyStyle={{ padding: 0 }}>
        <Menu mode="vertical">
          <ShowOnLogin>
            <Menu.Item key="profile">
              <Link to="/profile">Profile</Link>
            </Menu.Item>
            <Menu.Item key="collection">
              <Link to="/addword">Collection</Link>
            </Menu.Item>
            <Menu.Item key="logout">
              <Button type="link" onClick={logoutUser}>
                Logout
              </Button>
            </Menu.Item>
          </ShowOnLogin>
          <ShowOnLogout>
            <Menu.Item key="login">
              <Link to="/login">Login</Link>
            </Menu.Item>
          </ShowOnLogout>
        </Menu>
      </Drawer>
    </Header>
  );
};

export default AppHeader;
