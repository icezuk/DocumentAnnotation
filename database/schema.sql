CREATE DATABASE annotation_tool_db;
USE annotation_tool_db;

CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content LONGTEXT,
    file_type VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    description TEXT,
    user_id INT NOT NULL,
    parent_id INT,
    FOREIGN KEY (parent_id) REFERENCES labels(id)
        ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE annotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    label_id INT NOT NULL,
    start_offset INT,
    end_offset INT,
    selected_text TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id)
        ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id)
        ON DELETE CASCADE
);
CREATE TABLE label_relations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_label_id INT NOT NULL,
    to_label_id INT NOT NULL,
    relation_type VARCHAR(100),
    FOREIGN KEY (from_label_id) REFERENCES labels(id)
        ON DELETE CASCADE,
    FOREIGN KEY (to_label_id) REFERENCES labels(id)
        ON DELETE CASCADE
);