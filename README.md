# 剧院演出安全运营系统

基于 **Django REST Framework + PostgreSQL + React 18 + TypeScript + MUI** 构建的全栈剧院演出安全运营管理系统。

## 功能模块

### 1. 场次管理（演出经理）
- 创建、编辑、删除演出场次（草稿状态）
- 发布场次（自动创建三类安全检查项）
- 场次状态流转：草稿 → 待检查 → 可开售 → 销售中 → 已延期 / 已结束
- 多区域座位批量生成（支持不同区域不同票价）
- 座位容量控制：超过上限不可继续出票

### 2. 设备安全检查（设备主管）
- **三类必检项目**：
  - 吊杆检查 (RIGGING)
  - 灯光检查 (LIGHTING)
  - 消防检查 (FIRE) — **强制要求，未通过不可开售**
- 快速通过/不通过操作
- 详细编辑：检查结果、发现问题、备注
- 所有检查通过后场次自动进入"可开售"状态

### 3. 票务订单（票务人员）
- 按场次出票，支持多座位批量选择
- 实时显示：可用座位、已选座位、票面总额、手续费、应收合计
- 出票时校验：
  - 消防检查是否通过
  - 是否超过座位容量上限
  - 座位状态是否为可用
- 订单详情查看（座位明细、费用明细）

### 4. 退票流水
- 普通退票 / 延期场次退票
- **延期场次退票规则**：保留原订单信息，按手续费率扣除手续费
- 退票审批流程：待处理 → 批准 / 拒绝 → 完成
- 批准后退票：
  - 订单状态变更
  - 座位状态恢复为"已退票"
  - 实退金额 = 票面总额 - 手续费

## 技术架构

### 后端 (backend/)
- **Django 4.2** + **Django REST Framework 3.14**
- **PostgreSQL** 数据库
- **JWT** 身份认证 (djangorestframework-simplejwt)
- **CORS** 跨域支持
- 事务处理保证出票/退票数据一致性

### 前端 (frontend/)
- **React 18** + **TypeScript**
- **Vite** 构建工具
- **MUI (Material UI 5)** 组件库
- **MUI X Date Pickers** + dayjs 日期处理
- **Axios** HTTP 客户端
- **React Router** 路由管理

## 快速启动

### 前置要求
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+

---

### 一、后端启动

```bash
cd backend
```

#### 1. 创建虚拟环境并安装依赖
```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. 配置数据库
创建 PostgreSQL 数据库：
```sql
CREATE DATABASE theater_safety;
```

修改 `.env` 中的数据库连接信息（默认已配置本地）。

#### 3. 执行数据库迁移
```bash
python manage.py migrate
```

#### 4. 创建管理员用户
```bash
python manage.py createsuperuser
```

#### 5. 启动后端服务
```bash
python manage.py runserver 0.0.0.0:8000
```

后端 API 地址：http://localhost:8000/api/
Django Admin：http://localhost:8000/admin/

---

### 二、前端启动

```bash
cd frontend
```

#### 1. 安装依赖
```bash
npm install
```

#### 2. 启动开发服务器
```bash
npm run dev
```

前端地址：http://localhost:3000/

Vite 已配置 `/api` 代理到 `http://localhost:8000`，无需额外配置跨域。

---

## 使用说明

1. 启动后端和前端服务
2. 浏览器访问 http://localhost:3000
3. 使用 `createsuperuser` 创建的账号登录
4. 操作流程：
   - **步骤1**：场次管理 → 新增场次 → 填写信息保存
   - **步骤2**：在场次列表点击"发布"（自动创建三类检查项）
   - **步骤3**：设备检查 → 对吊杆/灯光/消防分别检查，标记为"通过"
   - **步骤4**：场次管理 → 场次详情 → 生成座位（配置区域和票价）
   - **步骤5**：场次列表 → "开售"（消防未通过会报错阻止）
   - **步骤6**：票务订单 → 新增出票 → 选择场次、座位、客户信息 → 出票
   - **步骤7**：如需退票 → 订单列表点击"退票" → 退票流水批准/拒绝

## 数据库表结构

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `shows_show` | 演出场次 | title, venue, show_time, status, total_capacity, ticket_price, service_fee_rate |
| `shows_seat` | 座位 | show, seat_number, seat_zone, status, price |
| `shows_equipmentinspection` | 设备检查 | show, inspection_type(rigging/lighting/fire), status(pending/pass/fail), inspector |
| `shows_order` | 票务订单 | order_no, show, customer_name, customer_phone, total_amount, service_fee, status |
| `shows_orderitem` | 订单明细 | order, seat, price |
| `shows_refund` | 退票流水 | refund_no, order, refund_amount, service_fee_deducted, status, is_postponed_refund, original_order_kept |

## API 接口一览

### 场次 (/api/shows/)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/shows/ | 场次列表（支持 status、search 参数） |
| POST | /api/shows/ | 创建场次 |
| GET | /api/shows/{id}/ | 场次详情 |
| PUT | /api/shows/{id}/ | 更新场次 |
| DELETE | /api/shows/{id}/ | 删除场次 |
| POST | /api/shows/{id}/publish/ | 发布场次 |
| POST | /api/shows/{id}/start_sale/ | 开始售票 |
| POST | /api/shows/{id}/stop_sale/ | 停止售票 |
| POST | /api/shows/{id}/postpone/ | 延期场次 |
| POST | /api/shows/{id}/generate_seats/ | 批量生成座位 |
| GET | /api/shows/{id}/seats/ | 获取场次座位 |
| GET | /api/shows/{id}/inspections/ | 获取场次检查项 |

### 设备检查 (/api/inspections/)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/inspections/ | 检查列表（支持 show_id、type 参数） |
| PUT | /api/inspections/{id}/ | 更新检查结果 |

### 订单 (/api/orders/)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders/ | 订单列表（支持 show_id、status、search 参数） |
| POST | /api/orders/create_order/ | 创建订单（出票） |

### 退票 (/api/refunds/)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/refunds/ | 退票列表（支持 show_id、order_id、status 参数） |
| POST | /api/refunds/create_refund/ | 创建退票申请 |
| POST | /api/refunds/{id}/approve/ | 批准退票 |
| POST | /api/refunds/{id}/reject/ | 拒绝退票 |

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/token/ | 获取 JWT Token |
| POST | /api/token/refresh/ | 刷新 Token |
