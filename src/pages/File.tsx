export const Filebrowser = () => {
    return (
        <iframe
            style={{ flexGrow: 1, borderWidth: 0 }}
            src={`${window.location.origin}/api/filebrowser`}
        />
    );
};
